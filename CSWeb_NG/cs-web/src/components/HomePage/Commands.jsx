import { useState, useEffect, useRef } from 'react';
import { getMenuIcon } from '../MainPage/menuIcons.jsx';

export default function Commands({ commands, onNavigate, t, isFavorite }) {
    return (
        <div className="fc-buttons">
            {commands.map((cmd) => (
                <div key={cmd.id} className="fc-item">
                    <button className="fc-btn" onClick={() => onNavigate?.(cmd)}>
                        <span className="menu-item-icon">{getMenuIcon(cmd.id)}</span>
                        <span>{t ? t(`router.${cmd.id}`) : cmd.id}</span>
                    </button>

                    {isFavorite && (
                        <button className="fc-remove" onClick={() => removeFavorite(cmd.id)}>
                            ✕
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
