<script>
    export let weekday;
    export let name;
    export let content;
</script>
<main>
    <div>
        <h2>{weekday}</h2>
        <input type="text" bind:value={name}>
        <textarea rows=30 cols="18" bind:value={content}></textarea>
    </div>
</main>
<style>
     div {
        background-color: rgb(1, 87, 25);
        display:inline-flex;
        flex-direction: column;
        margin: 0;
        padding: 10px 0;
        min-width: 50%;
    }
    h2 {
        color: rgb(255, 255, 255);
    }
</style>