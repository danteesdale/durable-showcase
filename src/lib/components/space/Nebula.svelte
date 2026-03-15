<script lang="ts">
	// Purely decorative CSS gradient nebula clouds
</script>

<div class="absolute inset-0 pointer-events-none overflow-hidden">
	<!-- Blue nebula - top right -->
	<div
		class="absolute rounded-full blur-3xl opacity-20"
		style="
			width: 600px;
			height: 400px;
			top: 5%;
			right: 10%;
			background: radial-gradient(ellipse, rgba(30, 58, 95, 0.6), transparent 70%);
		"
	></div>

	<!-- Purple nebula - bottom left -->
	<div
		class="absolute rounded-full blur-3xl opacity-15"
		style="
			width: 500px;
			height: 350px;
			bottom: 20%;
			left: 5%;
			background: radial-gradient(ellipse, rgba(76, 29, 149, 0.5), transparent 70%);
		"
	></div>

	<!-- Subtle cyan accent - center -->
	<div
		class="absolute rounded-full blur-3xl opacity-10"
		style="
			width: 300px;
			height: 200px;
			top: 40%;
			left: 45%;
			background: radial-gradient(ellipse, rgba(0, 180, 216, 0.4), transparent 70%);
		"
	></div>
</div>
