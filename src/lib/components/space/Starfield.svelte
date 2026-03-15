<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let animationId: number;
	let width = 0;
	let height = 0;

	interface Star {
		x: number;
		y: number;
		size: number;
		brightness: number;
		speed: number;
		twinkleSpeed: number;
		twinkleOffset: number;
	}

	interface ShootingStar {
		x: number;
		y: number;
		vx: number;
		vy: number;
		life: number;
		maxLife: number;
		length: number;
	}

	const layers: Star[][] = [];
	let shootingStars: ShootingStar[] = [];
	let nextShootingStarTime = 0;
	let time = 0;

	function initStars() {
		layers.length = 0;

		// Far stars (200) — small, dim, slow
		const far: Star[] = [];
		for (let i = 0; i < 200; i++) {
			far.push({
				x: Math.random() * width,
				y: Math.random() * height,
				size: 0.5 + Math.random() * 0.5,
				brightness: 0.3 + Math.random() * 0.2,
				speed: 0.1,
				twinkleSpeed: 0,
				twinkleOffset: 0
			});
		}
		layers.push(far);

		// Mid stars (100) — medium
		const mid: Star[] = [];
		for (let i = 0; i < 100; i++) {
			mid.push({
				x: Math.random() * width,
				y: Math.random() * height,
				size: 1 + Math.random(),
				brightness: 0.5 + Math.random() * 0.3,
				speed: 0.3,
				twinkleSpeed: 0,
				twinkleOffset: 0
			});
		}
		layers.push(mid);

		// Near stars (30) — large, bright, twinkle
		const near: Star[] = [];
		for (let i = 0; i < 30; i++) {
			near.push({
				x: Math.random() * width,
				y: Math.random() * height,
				size: 2 + Math.random(),
				brightness: 0.8 + Math.random() * 0.2,
				speed: 0.6,
				twinkleSpeed: 0.5 + Math.random() * 2,
				twinkleOffset: Math.random() * Math.PI * 2
			});
		}
		layers.push(near);

		nextShootingStarTime = 3000 + Math.random() * 5000;
	}

	function spawnShootingStar() {
		const startX = Math.random() * width * 0.8;
		const startY = Math.random() * height * 0.3;
		const angle = Math.PI / 6 + Math.random() * Math.PI / 6;
		const speed = 8 + Math.random() * 6;
		shootingStars.push({
			x: startX,
			y: startY,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: 0,
			maxLife: 600 + Math.random() * 400,
			length: 60 + Math.random() * 40
		});
	}

	function render(timestamp: number) {
		if (!ctx) return;

		const delta = 16; // ~60fps
		time += delta;

		ctx.clearRect(0, 0, width, height);

		// Draw stars
		for (const layer of layers) {
			for (const star of layer) {
				let alpha = star.brightness;
				if (star.twinkleSpeed > 0) {
					alpha *= 0.6 + 0.4 * Math.sin(time * star.twinkleSpeed * 0.001 + star.twinkleOffset);
				}

				ctx.beginPath();
				ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
				ctx.fill();

				// Subtle glow for near stars
				if (star.size > 2) {
					ctx.beginPath();
					ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.1})`;
					ctx.fill();
				}
			}
		}

		// Shooting stars
		if (time > nextShootingStarTime) {
			spawnShootingStar();
			nextShootingStarTime = time + 5000 + Math.random() * 10000;
		}

		shootingStars = shootingStars.filter((s) => {
			s.life += delta;
			s.x += s.vx;
			s.y += s.vy;

			if (s.life > s.maxLife) return false;

			const progress = s.life / s.maxLife;
			const alpha = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;

			// Trail
			const tailX = s.x - s.vx * (s.length / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * 0.5;
			const tailY = s.y - s.vy * (s.length / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * 0.5;

			const gradient = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
			gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
			gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.8})`);

			ctx.beginPath();
			ctx.moveTo(tailX, tailY);
			ctx.lineTo(s.x, s.y);
			ctx.strokeStyle = gradient;
			ctx.lineWidth = 1.5;
			ctx.stroke();

			// Head
			ctx.beginPath();
			ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
			ctx.fill();

			return true;
		});

		animationId = requestAnimationFrame(render);
	}

	function handleResize() {
		if (!canvas) return;
		width = canvas.clientWidth;
		height = canvas.clientHeight;
		canvas.width = width * window.devicePixelRatio;
		canvas.height = height * window.devicePixelRatio;
		ctx = canvas.getContext('2d')!;
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		initStars();
	}

	onMount(() => {
		handleResize();
		animationId = requestAnimationFrame(render);

		const resizeObserver = new ResizeObserver(handleResize);
		resizeObserver.observe(canvas);

		return () => {
			cancelAnimationFrame(animationId);
			resizeObserver.disconnect();
		};
	});
</script>

<canvas
	bind:this={canvas}
	class="absolute inset-0 w-full h-full"
	style="pointer-events: none;"
></canvas>
