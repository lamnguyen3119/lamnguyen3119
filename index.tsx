/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { MainMenu } from './components/views/MainMenu';
import { WorldCreator } from './components/views/WorldCreator';
import { GameView } from './components/views/GameView';
import { ApiKeyModal } from './components/modals/ApiKeyModal';
import { LoadGameModal } from './components/modals/LoadGameModal';
import { SettingsProvider, useSettings } from './components/contexts/SettingsContext';
import { ToastProvider, useToasts } from './components/contexts/ToastContext';
import { useHashNavigation } from './hooks/useHashNavigation';
import { ApiKeyManager } from './services/ApiKeyManager';
import * as db from './services/db';
import { hydrateGameState, hydrateWorldSettings } from './utils/hydration';
import { generateUniqueId } from './utils/id';
import { removeAccents } from './utils/text';
import { INITIAL_WC_FORM_DATA } from './constants/gameConstants';
import type { SaveFile, GameState, WorldSettings } from './types';

//================================================================
// CONTENT COMPONENT
//================================================================
const AppContent = () => {
    const currentView = useHashNavigation();
    const { settings } = useSettings();
    const { addToast } = useToasts();
    
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [worldSettings, setWorldSettings] = useState<WorldSettings>(() => hydrateWorldSettings(INITIAL_WC_FORM_DATA));
    const [isQuickCreating, setIsQuickCreating] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [userApiKeys, setUserApiKeys] = useState('');
    const [showLoadGameModal, setShowLoadGameModal] = useState(false);
    const [saves, setSaves] = useState<SaveFile[]>([]);
    const [apiStatus, setApiStatus] = useState('Đang kiểm tra trạng thái API...');

    const navigate = (view: string) => {
        window.location.hash = view;
    };

    useEffect(() => {
        if (currentView === 'game' && !gameState) {
            navigate('menu');
        }
    }, [currentView, gameState]);

    const handleApiKeyUpdate = useCallback(() => {
        const userKeys = localStorage.getItem('user_api_keys');
        const statusText = (userKeys && userKeys.trim() !== '') 
            ? 'Đang dùng API Key của bạn.' 
            : 'Đang dùng Gemini AI mặc định.';
        setApiStatus(statusText);
        addToast(statusText, 'info');
    }, [addToast]);

    useEffect(() => {
        const migrateData = async () => {
            const migrationKey = 'db_migrated_v1';
            if (localStorage.getItem(migrationKey)) {
                return;
            }

            console.log("Starting migration from localStorage to IndexedDB...");
            addToast("Đang nâng cấp hệ thống lưu trữ...", 'info');

            try {
                const existingSavesRaw = localStorage.getItem('game_saves');
                if (existingSavesRaw) {
                    const existingSaves: SaveFile[] = JSON.parse(existingSavesRaw);
                    if (Array.isArray(existingSaves) && existingSaves.length > 0) {
                        await Promise.all(existingSaves.map(save => db.addOrUpdateSave(save)));
                        console.log(`Migrated ${existingSaves.length} saves.`);
                    }
                }
                localStorage.setItem(migrationKey, 'true');
                addToast("Nâng cấp hoàn tất!", 'success');
                console.log("Migration complete.");
            } catch (error) {
                console.error("Migration failed:", error);
                addToast("Nâng cấp hệ thống lưu trữ thất bại.", 'error');
            }
        };

        const loadUserKeys = () => {
            const storedKeys = localStorage.getItem('user_api_keys') || '';
            setUserApiKeys(storedKeys);
        };

        migrateData();
        handleApiKeyUpdate();
        loadUserKeys();
    }, [addToast, handleApiKeyUpdate]);
    
    const handleSaveApiKeys = (keys: string) => {
        const trimmedKeys = keys.trim();
        if (trimmedKeys) {
            localStorage.setItem('user_api_keys', trimmedKeys);
        } else {
            localStorage.removeItem('user_api_keys');
        }
        setUserApiKeys(trimmedKeys);
        ApiKeyManager.loadKeys();
        handleApiKeyUpdate();
        setShowApiKeyModal(false);
    };

    const handleCreateWorld = (newGameState: GameState, newWorldSettings: WorldSettings) => {
        const hydratedState = hydrateGameState(newGameState, newWorldSettings);
        const hydratedSettings = hydrateWorldSettings(newWorldSettings);
    
        setGameState(hydratedState);
        setWorldSettings(hydratedSettings);
        
        handleSaveGame(hydratedState, hydratedSettings);
        addToast('Thế giới đã được tạo và lưu thành công!', 'success');
    
        setIsQuickCreating(false);
        navigate('game');
    };
    
    const handleStartQuickCreate = () => {
        setIsQuickCreating(true);
        navigate('create');
    }

    const handleSaveGame = async (currentGameState: GameState, currentWorldSettings: WorldSettings) => {
        try {
            let saveId = currentGameState.saveId || generateUniqueId('save');
            
            // Critical optimization: Exclude the history array from the saved state.
            // The history is only for in-session reverts and is the primary cause of save file bloat.
            const gameStateToSave = { ...currentGameState, history: [], saveId };

            const saveFile: SaveFile = {
                id: saveId,
                name: currentGameState.title,
                timestamp: new Date().toISOString(),
                gameState: gameStateToSave,
                worldSettings: currentWorldSettings,
            };

            await db.addOrUpdateSave(saveFile);

            if (!currentGameState.saveId) {
                setGameState(prev => prev ? hydrateGameState({ ...prev, saveId }, worldSettings) : null);
            }

        } catch (error) {
            console.error("Lỗi khi lưu game vào DB:", error);
            addToast("Đã xảy ra lỗi khi lưu game.", 'error');
        }
    };

    const handleLoadGame = (saveData: SaveFile) => {
        if (!saveData || !saveData.gameState) {
            console.error('Tệp lưu không hợp lệ. Dữ liệu nhận được:', saveData);
            addToast("Tệp lưu không hợp lệ hoặc bị hỏng.", 'error');
            return;
        }
        const loadedGameState = { ...saveData.gameState, saveId: saveData.id };
        setGameState(hydrateGameState(loadedGameState, saveData.worldSettings));
        setWorldSettings(hydrateWorldSettings(saveData.worldSettings));
        setShowLoadGameModal(false);
        navigate('game');
    };
    
    const handleDeleteGame = async (saveId: string) => {
        try {
            await db.deleteSave(saveId);
            setSaves(prevSaves => prevSaves.filter(s => s.id !== saveId));

            if (gameState && gameState.saveId === saveId) {
                setGameState(null);
            }

            addToast("Đã xóa tệp lưu thành công.", "success");
        } catch (error) {
            console.error("Lỗi khi xóa tệp lưu từ DB:", error);
            addToast("Đã xảy ra lỗi khi xóa tệp lưu.", "error");
        }
    };
    
    const handleOpenLoadGameModal = async () => {
        try {
            const allSaves = await db.getAllSaves();
            setSaves(allSaves);
        } catch (error) {
            console.error("Failed to load save games from DB:", error);
            addToast("Không thể tải các tệp lưu từ cơ sở dữ liệu.", 'error');
            setSaves([]);
        }
        setShowLoadGameModal(true);
    };
    
     const handleUploadSaves = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const readAndParseFile = (file: File): Promise<SaveFile> => {
            return new Promise<SaveFile>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = e.target?.result;
                        if (typeof content === 'string') {
                            const parsed = JSON.parse(content);
                            if (parsed && parsed.id && parsed.name && parsed.gameState && parsed.worldSettings) {
                                resolve(parsed);
                            } else {
                                reject(new Error(`Tệp ${file.name} không phải là tệp lưu hợp lệ.`));
                            }
                        } else {
                            reject(new Error(`Could not read file ${file.name} content.`));
                        }
                    } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        reject(new Error(`Lỗi phân tích cú pháp ${file.name}: ${message}`));
                    }
                };
                reader.onerror = (err) => reject(new Error(`Lỗi đọc tệp ${file.name}: ${err}`));
                reader.readAsText(file);
            });
        };

        const promises = Array.from(files).map(readAndParseFile);
        const results = await Promise.allSettled(promises);

        const validSaves = results
            .filter((r): r is PromiseFulfilledResult<SaveFile> => r.status === 'fulfilled')
            .map(r => r.value);
        const failedFiles = results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected');

        if (failedFiles.length > 0) {
            console.error("Không thể tải một số tệp:", failedFiles.map(f => f.reason));
            addToast(`Không thể tải ${failedFiles.length} tệp. Kiểm tra console để biết chi tiết.`, 'error');
        }

        if (validSaves.length === 0) {
            if (failedFiles.length === 0) addToast("Không có tệp lưu hợp lệ nào được chọn.", "warning");
            event.target.value = ''; // Reset input
            return;
        }

        try {
            await Promise.all(validSaves.map(save => db.addOrUpdateSave(save)));
            
            const allSaves = await db.getAllSaves();
            setSaves(allSaves);
            addToast(`Đã tải lên và hợp nhất thành công ${validSaves.length} tệp lưu.`, 'success');

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Lỗi khi hợp nhất các tệp lưu vào DB:", error);
            addToast(`Đã xảy ra lỗi khi hợp nhất các tệp lưu: ${message}`, 'error');
        }
        
        if (event.target) {
            event.target.value = '';
        }
    };
    
    const handleBackFromCreator = () => {
        setIsQuickCreating(false);
        navigate('menu');
    };

    const renderView = () => {
        if (currentView === 'game' && !gameState) {
             return null; // Don't render anything while navigating away
        }

        switch (currentView) {
            case 'create':
                return <WorldCreator onBack={handleBackFromCreator} onCreateWorld={handleCreateWorld} isQuickCreating={isQuickCreating} />;
            case 'game':
                return <GameView onNavigateToMenu={() => navigate('menu')} initialGameState={gameState!} worldSettings={worldSettings} onUpdateWorldSettings={setWorldSettings} onSaveGame={handleSaveGame} />;
            case 'menu':
            default:
                return <MainMenu 
                    onNavigate={(view) => {
                        if (view === 'quick-create') handleStartQuickCreate();
                        else if (view === 'load') handleOpenLoadGameModal();
                        else {
                            setIsQuickCreating(false);
                            navigate(view);
                        }
                    }} 
                    onOpenApiKeyModal={() => setShowApiKeyModal(true)} 
                    apiStatus={apiStatus} 
                />;
        }
    };

    const viewClasses: { [key: string]: string } = { menu: 'menu-view', create: 'creator-view', game: 'game-view' };

    return (
        <div className={`app-container ${viewClasses[currentView] || 'menu-view'} theme-${settings.theme}`}>
            {renderView()}
            {showApiKeyModal && <ApiKeyModal initialKeys={userApiKeys} onClose={() => setShowApiKeyModal(false)} onSave={handleSaveApiKeys} />}
            {showLoadGameModal && <LoadGameModal 
                saves={saves} 
                onClose={() => setShowLoadGameModal(false)} 
                onLoad={handleLoadGame} 
                onDelete={handleDeleteGame}
                onUpload={handleUploadSaves}
            />}
        </div>
    );
};

//================================================================
// ROOT APP COMPONENT
//================================================================
const App = () => (
    <ToastProvider>
        <SettingsProvider>
            <AppContent />
        </SettingsProvider>
    </ToastProvider>
);


//================================================================
// RENDERER
//================================================================

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<React.StrictMode><App /></React.StrictMode>);
}