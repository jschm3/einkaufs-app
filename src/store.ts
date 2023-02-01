import { writable } from 'svelte/store';
import { Plan } from './Plan';

export const items = writable(new Map());


let plans: Plan[] = [
	{weekday: "Mo", name: "", content: ""},
	{weekday: "Di", name: "", content: ""},
	{weekday: "Mi", name: "", content: ""},
	{weekday: "Do", name: "", content: ""},
	{weekday: "Fr", name: "", content: ""},
	{weekday: "Sa", name: "", content: ""},
	{weekday: "So", name: "", content: ""}
]




export const plan = writable(plans)