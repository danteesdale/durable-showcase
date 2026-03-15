<script lang="ts">
	import type { RocketState, StrategyType } from '$lib/simulation/types';
	import { ROCKET_CONFIG } from '$lib/constants';

	interface Props {
		strategyType: StrategyType;
		rocketState: RocketState;
		/** X position of the rocket nozzle in pixels from left of container */
		nozzleX: number;
		/** Y position center of the lane */
		nozzleY: number;
	}

	let { strategyType, rocketState, nozzleX, nozzleY }: Props = $props();

	const config = $derived(ROCKET_CONFIG[strategyType]);

	interface Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
		life: number;
		maxLife: number;
		size: number;
		hue: number;
	}

	let canvas: HTMLCanvasElement | undefined = $state();
	let particles: Particle[] = [];
	let animFrameId: number;

	const isActive = $derived(
		rocketState === 'in-progress' || rocketState === 'retrying' || rocketState === 'paused'
	);

	const isSputtering = $derived(
		rocketState === 'error-queue-stalled' ||
		rocketState === 'repair-approaching' ||
		rocketState === 'repair-docked'
	);

	// Parse the hex color to get RGB for particle coloring
	function hexToHSL(hex: string): number {
		const r = parseInt(hex.slice(1, 3), 16) / 255;
		const g = parseInt(hex.slice(3, 5), 16) / 255;
		const b = parseInt(hex.slice(5, 7), 16) / 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		let h = 0;
		if (max !== min) {
			const d = max - min;
			if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
			else if (max === g) h = ((b - r) / d + 2) / 6;
			else h = ((r - g) / d + 4) / 6;
		}
		return h * 360;
	}

	const baseHue = $derived(hexToHSL(config.color));

	let sputtterToggle = 0;
	let sputtterTimer = 0;

	function spawnParticle(x: number, y: number) {
		const spread = (Math.random() - 0.5) * 12;
		const speed = -(2 + Math.random() * 4); // move left (behind rocket)
		const life = 0.3 + Math.random() * 0.5;
		particles.push({
			x,
			y: y + spread,
			vx: speed,
			vy: (Math.random() - 0.5) * 1.5,
			life,
			maxLife: life,
			size: 1.5 + Math.random() * 2.5,
			hue: baseHue + (Math.random() - 0.5) * 30
		});
	}

	function animate() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const dt = 1 / 60;

		// Spawn new particles
		if (isActive && rocketState === 'in-progress') {
			for (let i = 0; i < 3; i++) {
				spawnParticle(nozzleX, nozzleY);
			}
		} else if (isActive && (rocketState === 'retrying' || rocketState === 'paused')) {
			// Reduced exhaust when paused/retrying
			if (Math.random() < 0.3) {
				spawnParticle(nozzleX, nozzleY);
			}
		} else if (isSputtering) {
			// Sputtering: on/off pattern
			sputtterTimer += dt;
			if (sputtterTimer > 0.4) {
				sputtterTimer = 0;
				sputtterToggle = sputtterToggle ? 0 : 1;
			}
			if (sputtterToggle && Math.random() < 0.5) {
				spawnParticle(nozzleX, nozzleY);
			}
		}

		// Update and draw particles
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.x += p.vx;
			p.y += p.vy;
			p.life -= dt;
			p.size *= 0.97;

			if (p.life <= 0 || p.size < 0.2) {
				particles.splice(i, 1);
				continue;
			}

			const alpha = (p.life / p.maxLife) * 0.8;
			const lightness = 50 + (1 - p.life / p.maxLife) * 30;

			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fillStyle = `hsla(${p.hue}, 80%, ${lightness}%, ${alpha})`;
			ctx.fill();

			// Inner glow
			if (p.size > 1.5) {
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
				ctx.fillStyle = `hsla(${p.hue}, 60%, 90%, ${alpha * 0.6})`;
				ctx.fill();
			}
		}

		animFrameId = requestAnimationFrame(animate);
	}

	$effect(() => {
		if (canvas) {
			// Size canvas to parent
			const parent = canvas.parentElement;
			if (parent) {
				canvas.width = parent.clientWidth;
				canvas.height = parent.clientHeight;
			}
			animFrameId = requestAnimationFrame(animate);
		}

		return () => {
			if (animFrameId) cancelAnimationFrame(animFrameId);
		};
	});
</script>

<canvas
	bind:this={canvas}
	class="absolute inset-0 pointer-events-none z-15"
	style="mix-blend-mode: screen;"
></canvas>
