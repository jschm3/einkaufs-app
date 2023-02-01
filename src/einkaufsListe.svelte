<script>
	import { fade, fly } from "svelte/transition";
    import ListItem from "./ListItem.svelte";
	import { items } from "./store.ts";
	let newItem;
	let unit = "";
	let amount = 0;

	const addToItems = () => {
		items.update( items => {
			items.set(newItem, newItem + " " + amount + " " + unit)
			newItem = ""
			amount = 0;
			return items
		})
	};
</script>
<main>
	<div>
		{#each [...$items] as item}
		<p>
			<ListItem bind:item={item} />
		</p>
		{/each}
		<div class="main">
			<input type="text" bind:value={newItem}>
		    <input type="number" bind:value={amount}>
			<label>
				<input type=radio bind:group={unit} name="unit" value={""}>
				Anzahl
			</label>
			<label class="main">
				<input type=radio bind:group={unit} name="unit" value={"g"}>
				Gramm
			</label>
			<label class="main">
				<input type=radio bind:group={unit} name="unit" value={"ml"}>
				Milliliter
			</label>
			<button on:click={addToItems}>
				Submit Item
			</button>
		</div>
	</div>

	
	
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>