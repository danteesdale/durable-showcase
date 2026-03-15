<script lang="ts">
	import type { StrategyType } from '$lib/simulation/types';

	interface Props {
		strategyType: StrategyType;
		x: number;
		y: number;
	}

	let { strategyType, x, y }: Props = $props();

	interface Sparkle {
		x: number;
		y: number;
		vx: number;
		vy: number;
		size: number;
		life: number;
		maxLife: number;
		hue: number;
	}

	let canvas: HTMLCanvasElement | undefined = $state();
	let sparkles: Sparkle[] = [];
	let animFrameId: number;
	let glowAlpha = 0.8;
	let spawned = false;

	function spawnCelebration() {
		if (spawned) return;
		spawned = true;

		for (let i = 0; i < 25; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 1 + Math.random() * 4;
			sparkles.push({
				x, y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 1.5,
				size: 1.5 + Math.random() * 2,
				life: 0.8 + Math.random() * 1,
				maxLife: 1.8,
				hue: 140 + Math.random() * 40 // green-teal
			});
		}
	}

	function animate() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const dt = 1 / 60;

		// Green glow
		if (glowAlpha > 0) {
			ctx.beginPath();
			ctx.arc(x, y, 25, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(6, 214, 160, ${glowAlpha * 0.2})`;
			ctx.fill();
			glowAlpha -= dt * 0.5;
		}

		for (let i = sparkles.length - 1; i >= 0; i--) {
			const s = sparkles[i];
			s.x += s.vx;
			s.y += s.vy;
			s.vy += 0.03;
			s.life -= dt;

			if (s.life <= 0) {
				sparkles.splice(i, 1);
				continue;
			}

			const alpha = s.life / s.maxLife;
			ctx.beginPath();
			ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
			ctx.fillStyle = `hsla(${s.hue}, 80%, 70%, ${alpha})`;
			ctx.fill();

			// Star shape highlight
			ctx.beginPath();
			ctx.arc(s.x, s.y, s.size * 0.4 * alpha, 0, Math.PI * 2);
			ctx.fillStyle = `hsla(${s.hue}, 60%, 95%, ${alpha * 0.7})`;
			ctx.fill();
		}

		if (sparkles.length > 0 || glowAlpha > 0) {
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
			spawnCelebration();
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
