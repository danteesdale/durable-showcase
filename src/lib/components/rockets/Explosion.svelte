<script lang="ts">
	import type { StrategyType } from '$lib/simulation/types';
	import { ROCKET_CONFIG } from '$lib/constants';

	interface Props {
		strategyType: StrategyType;
		/** Center X in pixels */
		x: number;
		/** Center Y in pixels */
		y: number;
	}

	let { strategyType, x, y }: Props = $props();

	const config = $derived(ROCKET_CONFIG[strategyType]);

	interface Debris {
		x: number;
		y: number;
		vx: number;
		vy: number;
		rotation: number;
		rotSpeed: number;
		size: number;
		life: number;
		maxLife: number;
		type: 'spark' | 'chunk' | 'smoke';
		hue: number;
	}

	let canvas: HTMLCanvasElement | undefined = $state();
	let debris: Debris[] = [];
	let animFrameId: number;
	let flashAlpha = 1;
	let spawned = false;

	function spawnExplosion() {
		if (spawned) return;
		spawned = true;

		// Sparks — fast, bright
		for (let i = 0; i < 30; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 2 + Math.random() * 6;
			debris.push({
				x, y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				rotation: 0,
				rotSpeed: (Math.random() - 0.5) * 10,
				size: 1 + Math.random() * 2,
				life: 0.5 + Math.random() * 0.8,
				maxLife: 1.3,
				type: 'spark',
				hue: 20 + Math.random() * 30 // orange-yellow
			});
		}

		// Chunks — slow, tumbling
		for (let i = 0; i < 8; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 1 + Math.random() * 3;
			debris.push({
				x, y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 1,
				rotation: Math.random() * Math.PI * 2,
				rotSpeed: (Math.random() - 0.5) * 6,
				size: 3 + Math.random() * 4,
				life: 1 + Math.random() * 1,
				maxLife: 2,
				type: 'chunk',
				hue: 0 // red
			});
		}

		// Smoke — slow, expanding
		for (let i = 0; i < 12; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 0.5 + Math.random() * 1.5;
			debris.push({
				x, y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 0.3,
				rotation: 0,
				rotSpeed: 0,
				size: 4 + Math.random() * 6,
				life: 1.5 + Math.random() * 1.5,
				maxLife: 3,
				type: 'smoke',
				hue: 0
			});
		}
	}

	function animate() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const dt = 1 / 60;

		// Initial flash
		if (flashAlpha > 0) {
			ctx.fillStyle = `rgba(255, 200, 100, ${flashAlpha * 0.4})`;
			ctx.beginPath();
			ctx.arc(x, y, 30 + (1 - flashAlpha) * 20, 0, Math.PI * 2);
			ctx.fill();
			flashAlpha -= dt * 4;
		}

		// Update and draw debris
		for (let i = debris.length - 1; i >= 0; i--) {
			const d = debris[i];
			d.x += d.vx;
			d.y += d.vy;
			d.vy += 0.05; // gravity
			d.vx *= 0.99; // drag
			d.rotation += d.rotSpeed * dt;
			d.life -= dt;

			if (d.life <= 0) {
				debris.splice(i, 1);
				continue;
			}

			const alpha = Math.max(0, d.life / d.maxLife);

			if (d.type === 'spark') {
				ctx.beginPath();
				ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
				ctx.fillStyle = `hsla(${d.hue}, 100%, 70%, ${alpha})`;
				ctx.fill();
				// Glow
				ctx.beginPath();
				ctx.arc(d.x, d.y, d.size * 2, 0, Math.PI * 2);
				ctx.fillStyle = `hsla(${d.hue}, 100%, 80%, ${alpha * 0.3})`;
				ctx.fill();
			} else if (d.type === 'chunk') {
				ctx.save();
				ctx.translate(d.x, d.y);
				ctx.rotate(d.rotation);
				ctx.fillStyle = `hsla(0, 0%, 40%, ${alpha})`;
				ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size * 0.6);
				ctx.restore();
			} else {
				// Smoke — expanding, fading
				const smokeSize = d.size * (1 + (1 - alpha) * 2);
				ctx.beginPath();
				ctx.arc(d.x, d.y, smokeSize, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(80, 80, 80, ${alpha * 0.25})`;
				ctx.fill();
			}
		}

		if (debris.length > 0 || flashAlpha > 0) {
			animFrameId = requestAnimationFrame(animate);
		}
	}

	$effect(() => {
		if (canvas) {
			const parent = canvas.parentElement;
			if (parent) {
				canvas.width = parent.clientWidth;
				canvas.height = parent.clientHeight;
			}
			spawnExplosion();
			animFrameId = requestAnimationFrame(animate);
		}

		return () => {
			if (animFrameId) cancelAnimationFrame(animFrameId);
		};
	});
</script>

<canvas
	bind:this={canvas}
	class="absolute inset-0 pointer-events-none z-25"
></canvas>
