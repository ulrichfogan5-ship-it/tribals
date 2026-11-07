// ==UserScript==
// @name Tribals.io ESP + AimBot Pro (Fixed & Clean) 🌴
// @namespace http://tampermonkey.net/
// @version 1.2.6
// @description Tribals.io esp + aimbot with automatic stale player cleanup
// @author You & AI Enhanced
// @match https://tribals.io/*
// @icon https://www.google.com/s2/favicons?sz=64&domain=tribals.io
// @grant unsafeWindow
// @run-at document-end
// ==/UserScript==

(function() {
    'use strict';

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    win.console.log('[EVENT] Tribals client loaded v1.2.6 (Cleaned)');

    win.tribalsConfig = {
        espEnabled: false,
        aimbotEnabled: false,
        fovRadius: 120
    };

    win.tribals = {
        players: [],
        localPlayer: null
    };

    let mainLoopId = null;
    let originalCameraState = null;
    const AIMBOT_MAX_PITCH = (Math.PI / 2) - 0.01;
    const RAD_TO_DEG = 180 / Math.PI;

    function sendLogSafe(msg) {
        try {
            win.console.log('[HACK-LOG]', msg);
        } catch (e) {}
    }

    /* Interface Graphique (GUI) */
    function initializeUI() {
        if (document.getElementById('tribals-hack-gui')) return;

        const style = document.createElement('style');
        style.textContent = `
            #tribals-hack-gui {
                position: absolute;
                top: 100px;
                left: 15px;
                z-index: 99999;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: rgba(15, 15, 15, 0.85);
                border: 1px solid #333;
                border-radius: 8px;
                color: #fff;
                width: 220px;
                user-select: none;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                backdrop-filter: blur(5px);
            }
            .tribals-gui-header {
                padding: 10px;
                background: rgba(0, 255, 0, 0.1);
                border-bottom: 1px solid #333;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                cursor: move;
                font-weight: bold;
                font-size: 14px;
                color: #00ff00;
                text-align: center;
            }
            .tribals-gui-body { padding: 12px; font-size: 13px; }
            .tribals-control-group { margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
            .tribals-control-group label { cursor: pointer; }
            .tribals-control-group input[type="checkbox"] { cursor: pointer; accent-color: #00ff00; }
            .tribals-slider-group { margin-top: 10px; }
            .tribals-slider-group label { display: block; margin-bottom: 5px; font-size: 12px; color: #bbb; }
            .tribals-slider-group input[type="range"] { width: 100%; accent-color: #00ff00; }
            .tribals-footer { font-size: 10px; text-align: center; color: #666; margin-top: 8px; border-top: 1px solid #222; padding-top: 5px; }
        `;
        document.head.appendChild(style);

        const uiDiv = document.createElement('div');
        uiDiv.id = 'tribals-hack-gui';
        uiDiv.innerHTML = `
            <div class="tribals-gui-header" id="tribals-gui-drag">Tribals.io Pro Menu</div>
            <div class="tribals-gui-body">
                <div class="tribals-control-group">
                    <label for="toggle-esp">ESP (Box + Name) [E]</label>
                    <input type="checkbox" id="toggle-esp">
                </div>
                <div class="tribals-control-group">
                    <label for="toggle-aim">AimBot [Q]</label>
                    <input type="checkbox" id="toggle-aim">
                </div>
                <div class="tribals-slider-group">
                    <label for="fov-slider">Aimbot FOV: <span id="fov-val">120</span>px</label>
                    <input type="range" id="fov-slider" min="50" max="400" value="120">
                </div>
                <div class="tribals-footer">Appuyez sur E ou Q pour basculer</div>
            </div>
        `;
        document.body.appendChild(uiDiv);

        // Drag & Drop
        const header = document.getElementById('tribals-gui-drag');
        let isDragging = false, offsetX = 0, offsetY = 0;
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - uiDiv.offsetLeft;
            offsetY = e.clientY - uiDiv.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            uiDiv.style.left = (e.clientX - offsetX) + 'px';
            uiDiv.style.top = (e.clientY - offsetY) + 'px';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });

        const espCheckbox = document.getElementById('toggle-esp');
        const aimCheckbox = document.getElementById('toggle-aim');
        const fovSlider = document.getElementById('fov-slider');
        const fovVal = document.getElementById('fov-val');

        espCheckbox.addEventListener('change', () => {
            win.tribalsConfig.espEnabled = espCheckbox.checked;
            manageCanvas(win.tribalsConfig.espEnabled);
        });

        aimCheckbox.addEventListener('change', () => {
            win.tribalsConfig.aimbotEnabled = aimCheckbox.checked;
        });

        fovSlider.addEventListener('input', () => {
            win.tribalsConfig.fovRadius = parseInt(fovSlider.value);
            fovVal.textContent = win.tribalsConfig.fovRadius;
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'e' || e.key === 'E') {
                espCheckbox.checked = !espCheckbox.checked;
                espCheckbox.dispatchEvent(new Event('change'));
            }
            if (e.key === 'q' || e.key === 'Q') {
                aimCheckbox.checked = !aimCheckbox.checked;
                aimCheckbox.dispatchEvent(new Event('change'));
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUI);
    } else {
        initializeUI();
    }

    // ===================== MATH & AIMBOT UTILS =======================
    function cloneQuat(quat) {
        if (!quat) return null;
        return {
            x: Number(quat.x) || 0,
            y: Number(quat.y) || 0,
            z: Number(quat.z) || 0,
            w: Number.isFinite(Number(quat.w)) ? Number(quat.w) : 1
        };
    }

    function getAimNode(cameraEntity) {
        if (!cameraEntity) return null;
        if (typeof cameraEntity.setLocalEulerAngles === 'function' || typeof cameraEntity.setLocalRotation === 'function' || cameraEntity.quaternion) return cameraEntity;
        if (cameraEntity.entity) return cameraEntity.entity;
        if (cameraEntity.camera && cameraEntity.camera.entity) return cameraEntity.camera.entity;
        return cameraEntity;
    }

    function getNodeWorldPosition(node) {
        if (!node) return null;
        if (typeof node.getPosition === 'function') return node.getPosition().clone();
        if (node.position) return typeof node.position.clone === 'function' ? node.position.clone() : { x: Number(node.position.x) || 0, y: Number(node.position.y) || 0, z: Number(node.position.z) || 0 };
        if (node.entity) return getNodeWorldPosition(node.entity);
        return null;
    }

    function getNodeLocalQuaternion(node) {
        if (!node) return null;
        if (typeof node.getLocalRotation === 'function') return cloneQuat(node.getLocalRotation());
        if (node.quaternion) return cloneQuat(node.quaternion);
        if (node.entity) return getNodeLocalQuaternion(node.entity);
        return null;
    }

    function getNodeParentQuaternion(node) {
        if (!node) return null;
        const parent = node.parent || (node.entity && node.entity.parent) || (node.camera && node.camera.entity && node.camera.entity.parent);
        if (!parent) return null;
        if (typeof parent.getRotation === 'function') return cloneQuat(parent.getRotation());
        if (parent.quaternion) return cloneQuat(parent.quaternion);
        return null;
    }

    function setNodeLocalQuaternion(node, quat) {
        if (!node || !quat) return false;
        if (typeof node.setLocalEulerAngles === 'function') {
            const forward = rotateVecByQuat({ x: 0, y: 0, z: -1 }, quat);
            const pitch = Math.atan2(forward.y, Math.hypot(forward.x, forward.z));
            const yaw = Math.atan2(-forward.x, -forward.z);
            node.setLocalEulerAngles(pitch * RAD_TO_DEG, yaw * RAD_TO_DEG, 0);
            return true;
        }
        if (typeof node.setLocalRotation === 'function' && win.pc && typeof win.pc.Quat === 'function') {
            node.setLocalRotation(new win.pc.Quat(quat.x, quat.y, quat.z, quat.w));
            return true;
        }
        if (node.quaternion) {
            if (typeof node.quaternion.set === 'function') node.quaternion.set(quat.x, quat.y, quat.z, quat.w);
            else { node.quaternion.x = quat.x; node.quaternion.y = quat.y; node.quaternion.z = quat.z; node.quaternion.w = quat.w; }
            return true;
        }
        return false;
    }

    function normalizeVec3(vec) {
        const length = Math.hypot(vec.x, vec.y, vec.z);
        if (!length) return null;
        return { x: vec.x / length, y: vec.y / length, z: vec.z / length };
    }

    function invertQuat(quat) {
        const lengthSq = (quat.x * quat.x) + (quat.y * quat.y) + (quat.z * quat.z) + (quat.w * quat.w) || 1;
        return { x: -quat.x / lengthSq, y: -quat.y / lengthSq, z: -quat.z / lengthSq, w: quat.w / lengthSq };
    }

    function rotateVecByQuat(vec, quat) {
        const qx = quat.x, qy = quat.y, qz = quat.z, qw = quat.w;
        const vx = vec.x, vy = vec.y, vz = vec.z;
        const ix = (qw * vx) + (qy * vz) - (qz * vy);
        const iy = (qw * vy) + (qz * vx) - (qx * vz);
        const iz = (qw * vz) + (qx * vy) - (qy * vx);
        const iw = (-qx * vx) - (qy * vy) - (qz * vz);
        return {
            x: (ix * qw) + (iw * -qx) + (iy * -qz) - (iz * -qy),
            y: (iy * qw) + (iw * -qy) + (iz * -qx) - (ix * -qz),
            z: (iz * qw) + (iw * -qz) + (ix * -qy) - (iy * -qx)
        };
    }

    function crossVec3(a, b) {
        return { x: (a.y * b.z) - (a.z * b.y), y: (a.z * b.x) - (a.x * b.z), z: (a.x * b.y) - (a.y * b.x) };
    }

    function quatFromBasis(right, up, back) {
        const m00 = right.x, m01 = up.x, m02 = back.x;
        const m10 = right.y, m11 = up.y, m12 = back.y;
        const m20 = right.z, m21 = up.z, m22 = back.z;
        const trace = m00 + m11 + m22;
        let x, y, z, w;
        if (trace > 0) {
            const s = Math.sqrt(trace + 1) * 2;
            w = 0.25 * s;
            x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s;
        } else if (m00 > m11 && m00 > m22) {
            const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
            w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
            w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s;
        } else {
            const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
            w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s;
        }
        return cloneQuat({ x, y, z, w });
    }

    function quatFromLookDirection(direction) {
        const forward = normalizeVec3(direction);
        if (!forward) return null;
        let right = normalizeVec3(crossVec3(forward, { x: 0, y: 1, z: 0 })) || { x: 1, y: 0, z: 0 };
        const up = normalizeVec3(crossVec3(right, forward)) || { x: 0, y: 1, z: 0 };
        return quatFromBasis(right, up, { x: -forward.x, y: -forward.y, z: -forward.z });
    }

    function aimNodeAtTarget(cameraEntity, targetPosition) {
        const aimNode = getAimNode(cameraEntity);
        const worldPosition = getNodeWorldPosition(aimNode);
        if (!aimNode || !worldPosition || !targetPosition) return false;
        const worldDirection = normalizeVec3({
            x: (Number(targetPosition.x) || 0) - worldPosition.x,
            y: (Number(targetPosition.y) || 0) - worldPosition.y,
            z: (Number(targetPosition.z) || 0) - worldPosition.z
        });
        if (!worldDirection) return false;
        const parentQuat = getNodeParentQuaternion(aimNode);
        const localDirection = parentQuat ? normalizeVec3(rotateVecByQuat(worldDirection, invertQuat(parentQuat))) : worldDirection;
        if (!localDirection) return false;
        const pitch = Math.max(-AIMBOT_MAX_PITCH, Math.min(AIMBOT_MAX_PITCH, Math.atan2(localDirection.y, Math.hypot(localDirection.x, localDirection.z))));
        const yaw = Math.atan2(-localDirection.x, -localDirection.z);
        const clampedDirection = normalizeVec3({ x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) });
        if (!clampedDirection) return false;
        const localQuat = quatFromLookDirection(clampedDirection);
        return setNodeLocalQuaternion(aimNode, localQuat);
    }

    /* Hookation robuste */
    const sym = Symbol('Local Player Hook Pro');
    try {
        Object.defineProperty(Object.prototype, 'isSleeping', {
            set(data) {
                this[sym] = data;
                if (this.protected) {
                    win.tribals.localPlayer = this;
                    if (typeof this.randomChecks === 'function') this.randomChecks = function() {};
                }
                if (this.username !== undefined && this.entity && this.entity.position) {
                    let existing = win.tribals.players.find(p => p.username === this.username);
                    if (!existing) {
                        win.tribals.players.push({
                            username: this.username,
                            obj: this,
                            lastPosition: { x: this.entity.position.x, y: this.entity.position.y, z: this.entity.position.z },
                            lastActiveTime: Date.now()
                        });
                    } else {
                        existing.obj = this;
                        existing.lastActiveTime = Date.now();
                    }
                }
            },
            get() { return this[sym]; },
            configurable: true
        });
    } catch (e) {}

    win.getAllPlayers = function() {
        let players = [];
        win.tribals.players.forEach(plr => {
            if (plr && plr.obj && plr.obj.entity) {
                if (!players.some(p => p.username === plr.username)) {
                    players.push(plr);
                }
            }
        });
        return players;
    };

    /* Gestionnaire du Canvas ESP */
    let espCanvas = null;
    let ctx = null;

    function manageCanvas(enabled) {
        if (enabled) {
            if (!espCanvas) {
                espCanvas = document.createElement('canvas');
                espCanvas.id = 'espCanvas';
                espCanvas.style.position = 'absolute';
                espCanvas.style.top = '0';
                espCanvas.style.left = '0';
                espCanvas.style.zIndex = '2147483647';
                espCanvas.style.pointerEvents = 'none';
                document.body.appendChild(espCanvas);
            }
            ctx = espCanvas.getContext('2d');
        } else {
            if (espCanvas) {
                espCanvas.remove();
                espCanvas = null;
                ctx = null;
            }
        }
    }

    /* Boucle principale globale indépendante */
    function masterGameLoop() {
        const centerX = win.innerWidth / 2;
        const centerY = win.innerHeight / 2;
        const radius = win.tribalsConfig.fovRadius;

        // Gestion du rendu ESP
        if (win.tribalsConfig.espEnabled && espCanvas && ctx) {
            if (espCanvas.width !== win.innerWidth || espCanvas.height !== win.innerHeight) {
                espCanvas.width = win.innerWidth;
                espCanvas.height = win.innerHeight;
            }
            ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);
        }

        // Cercle FOV Aimbot
        if (win.tribalsConfig.aimbotEnabled && win.tribalsConfig.espEnabled && ctx) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        let target = null;
        let minDist = Infinity;
        const currentTime = Date.now();

        // Nettoyage automatique des joueurs déconnectés ou inactifs depuis plus de 4 secondes
        win.tribals.players = win.tribals.players.filter(plr => {
            if (!plr.obj || !plr.obj.entity || !plr.obj.entity.position) return false;
            if (currentTime - (plr.lastActiveTime || currentTime) > 4000) return false;
            return true;
        });

        win.getAllPlayers().forEach(plr => {
            if (!plr.obj || !plr.obj.entity || !plr.obj.entity.position) return;
            const currentPosition = plr.obj.entity.position;

            if (!plr.lastPosition) {
                plr.lastPosition = { ...currentPosition };
                plr.lastActiveTime = currentTime;
            }

            const distanceMoved = Math.hypot(
                currentPosition.x - plr.lastPosition.x,
                currentPosition.y - plr.lastPosition.y,
                currentPosition.z - plr.lastPosition.z
            );

            // Met à jour le timestamp d'activité si le joueur bouge ou transmet des données
            if (distanceMoved > 0 || plr.obj === win.tribals.localPlayer) {
                plr.lastActiveTime = currentTime;
                plr.lastPosition = { ...currentPosition };
            }

            if (win.tribals.localPlayer && win.tribals.localPlayer.cameraEntity && win.tribals.localPlayer.cameraEntity.camera) {
                try {
                    const screen = win.tribals.localPlayer.cameraEntity.camera.worldToScreen(currentPosition.clone());
                    if (screen.z >= 1.0) {
                        // Dessin ESP
                        if (win.tribalsConfig.espEnabled && ctx) {
                            const scale = 4 / screen.z;
                            const w = 60 * scale;
                            const h = 150 * scale;
                            const x = screen.x - w / 2;
                            const y = screen.y - h / 2;

                            ctx.strokeStyle = '#00ff00';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(x, y, w, h);

                            ctx.font = 'bold 12px Arial';
                            ctx.fillStyle = '#00ff00';
                            ctx.fillText(plr.username || 'Inconnu', screen.x - 25, screen.y - 25);
                        }

                        // Sélection Cible Aimbot
                        if (win.tribalsConfig.aimbotEnabled && plr.obj !== win.tribals.localPlayer) {
                            const dx = screen.x - centerX;
                            const dy = screen.y - centerY;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < radius && dist < minDist) {
                                target = plr;
                                minDist = dist;
                            }
                        }
                    }
                } catch (err) {}
            }
        });

        // Application Aimbot
        const aimNode = win.tribals.localPlayer && win.tribals.localPlayer.cameraEntity ? getAimNode(win.tribals.localPlayer.cameraEntity) : null;
        if (win.tribalsConfig.aimbotEnabled && target) {
            if (!originalCameraState && aimNode) {
                originalCameraState = { quaternion: getNodeLocalQuaternion(aimNode) };
            }
            aimNodeAtTarget(win.tribals.localPlayer.cameraEntity, target.obj.entity.position);
        } else {
            if (originalCameraState && aimNode && originalCameraState.quaternion) {
                setNodeLocalQuaternion(aimNode, originalCameraState.quaternion);
                originalCameraState = null;
            }
        }

        mainLoopId = requestAnimationFrame(masterGameLoop);
    }

    mainLoopId = requestAnimationFrame(masterGameLoop);
    sendLogSafe('Master loop running successfully');
})();