<script lang="ts">
	import EinkaufsListe from "./einkaufsListe.svelte";
    import WochenPlan from "./WochenPlan.svelte";


</script>
<main>
	<div class="container">
		<div class="plan"> 
			<h1>WochenPlan</h1>

			<WochenPlan></WochenPlan>
		</div>		
		<div class="liste">
			<h1>Liste</h1>

			<EinkaufsListe></EinkaufsListe>
		</div>
		
	
	</div>
	<button>Submit Plan Changes</button>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}

	.container {
    	display: flex;
	}
	.liste {
		width: 25%;
		float: right;
		
		
	}
	.plan {
		flex: 1;
    	
	}
	
</style>