<script >
    import DayFocused from "./DayFocused.svelte";
    import DayRecipe from "./Day.svelte";
    import { plan } from './store.ts';
    const rows = 33;
    let showFocus = false;
    let focusedDay= {
        weekday: "",
        name: "",
        content: ""
    };

    const set = ( ) => {
        console.log(showFocus)
        showFocus = false
    }
    
    function setFocusedDay(weekday, name, content){
        console.log(showFocus)
        showFocus = true
        focusedDay.weekday =  weekday
        focusedDay.name =  name
        focusedDay.content =  content
        console.log(name)
    }
    
</script>

<main>
    <div hidden={showFocus}>
        <ul class="container">s
            {#each [...$plan] as p}
                <li class="weekdays">
                    <button class="setButton" on:click={setFocusedDay(p.weekday, p.name, p.content)}>{p.weekday}</button>
                    <DayRecipe bind:weekday={p.weekday} bind:name={p.name} bind:content={p.content}></DayRecipe >
                    
                </li>
                
            {/each}
        </ul>

    </div>
    <div hidden={!showFocus}>
        <DayFocused bind:weekday={focusedDay.weekday} bind:name={focusedDay.name} bind:content={focusedDay.content}></DayFocused>
       
    </div>
    <button on:click={set}>Reset Focus</button>
</main>

<style>
    @media (min-width: 640px) {
        .container {
        display:inline-flex;
        margin: 0;
        padding: 10px 0;

    }
    }
    .container {
        background-color: rgb(1, 87, 25);
        margin: 0;
        padding: 10px 0;

    }

    .weekdays {
        display: flex;

    }
    .setButton {
        float: left;

        margin-top: 5px;
        max-height: 50px;
        max-width: 50px;
    }

</style>