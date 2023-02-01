<script>
    export let weekday;
    export let name;
    export let content;
</script>
<main>
    <div>
        <input class="title" type="text" bind:value={name}>
        <textarea rows=30 cols="18" bind:value={content}></textarea>
    </div>
</main>
<style>
    div {
        background-color: rgb(1, 87, 25);
    }
    h3 {
        float: left;
        color: rgb(255, 255, 255);
    }
    textarea,input {
        width: 75%;
        margin-left:  0;
        margin-right: 20px;
    }
</style>