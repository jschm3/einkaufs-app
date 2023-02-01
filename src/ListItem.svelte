<script>
    import { fade, fly, slide } from "svelte/transition";
	export let item;
    export let stricken = false;
    import { items } from "./store.js";
    console.log(item)

    const RemoveFromItems = () => {
		items.update( items => {
			items.delete(item[0])
			return items
		})
	};
</script>

<div in:slide="{{ y: 400, duration: 1000 }}" out:fade>
    {#if stricken}
        <s>
            {item[1]}
        </s>
    {:else}
        {item[1]}
    {/if}

    <input type=checkbox bind:checked={stricken}>
    <button on:click={RemoveFromItems}>DELETE</button>
</div>