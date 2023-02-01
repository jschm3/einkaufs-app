
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
        return style.sheet;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { ownerNode } = info.stylesheet;
                // there is no ownerNode if it runs on jsdom.
                if (ownerNode)
                    detach(ownerNode);
            });
            managed_styles.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        const options = { direction: 'in' };
        let config = fn(node, params, options);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                started = true;
                delete_rule(node);
                if (is_function(config)) {
                    config = config(options);
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        const options = { direction: 'out' };
        let config = fn(node, params, options);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config(options);
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut } = {}) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => 'overflow: hidden;' +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const items = writable(new Map());
    let plans = [
        { weekday: "Mo", name: "", content: "" },
        { weekday: "Di", name: "", content: "" },
        { weekday: "Mi", name: "", content: "" },
        { weekday: "Do", name: "", content: "" },
        { weekday: "Fr", name: "", content: "" },
        { weekday: "Sa", name: "", content: "" },
        { weekday: "So", name: "", content: "" }
    ];
    const plan = writable(plans);

    /* src/ListItem.svelte generated by Svelte v3.55.1 */

    const { console: console_1$1 } = globals;
    const file$5 = "src/ListItem.svelte";

    // (21:4) {:else}
    function create_else_block(ctx) {
    	let t_value = /*item*/ ctx[1][1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*item*/ 2 && t_value !== (t_value = /*item*/ ctx[1][1] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(21:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (17:4) {#if stricken}
    function create_if_block(ctx) {
    	let s;
    	let t_value = /*item*/ ctx[1][1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			s = element("s");
    			t = text(t_value);
    			add_location(s, file$5, 17, 8, 387);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, s, anchor);
    			append_dev(s, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*item*/ 2 && t_value !== (t_value = /*item*/ ctx[1][1] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(s);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(17:4) {#if stricken}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let t0;
    	let input;
    	let t1;
    	let button;
    	let div_intro;
    	let div_outro;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*stricken*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			t0 = space();
    			input = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = "DELETE";
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file$5, 24, 4, 471);
    			add_location(button, file$5, 25, 4, 521);
    			add_location(div, file$5, 15, 0, 305);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, input);
    			input.checked = /*stricken*/ ctx[0];
    			append_dev(div, t1);
    			append_dev(div, button);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_handler*/ ctx[3]),
    					listen_dev(button, "click", /*RemoveFromItems*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			}

    			if (dirty & /*stricken*/ 1) {
    				input.checked = /*stricken*/ ctx[0];
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				div_intro = create_in_transition(div, slide, { y: 400, duration: 1000 });
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, fade, {});
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			if (detaching && div_outro) div_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ListItem', slots, []);
    	let { item } = $$props;
    	let { stricken = false } = $$props;
    	console.log(item);

    	const RemoveFromItems = () => {
    		items.update(items => {
    			items.delete(item[0]);
    			return items;
    		});
    	};

    	$$self.$$.on_mount.push(function () {
    		if (item === undefined && !('item' in $$props || $$self.$$.bound[$$self.$$.props['item']])) {
    			console_1$1.warn("<ListItem> was created without expected prop 'item'");
    		}
    	});

    	const writable_props = ['item', 'stricken'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<ListItem> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler() {
    		stricken = this.checked;
    		$$invalidate(0, stricken);
    	}

    	$$self.$$set = $$props => {
    		if ('item' in $$props) $$invalidate(1, item = $$props.item);
    		if ('stricken' in $$props) $$invalidate(0, stricken = $$props.stricken);
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		fly,
    		slide,
    		item,
    		stricken,
    		items,
    		RemoveFromItems
    	});

    	$$self.$inject_state = $$props => {
    		if ('item' in $$props) $$invalidate(1, item = $$props.item);
    		if ('stricken' in $$props) $$invalidate(0, stricken = $$props.stricken);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [stricken, item, RemoveFromItems, input_change_handler];
    }

    class ListItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { item: 1, stricken: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ListItem",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get item() {
    		throw new Error("<ListItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<ListItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get stricken() {
    		throw new Error("<ListItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stricken(value) {
    		throw new Error("<ListItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/einkaufsListe.svelte generated by Svelte v3.55.1 */
    const file$4 = "src/einkaufsListe.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	child_ctx[13] = list;
    	child_ctx[14] = i;
    	return child_ctx;
    }

    // (20:2) {#each [...$items] as item}
    function create_each_block$1(ctx) {
    	let p;
    	let listitem;
    	let updating_item;
    	let current;

    	function listitem_item_binding(value) {
    		/*listitem_item_binding*/ ctx[5](value, /*item*/ ctx[12], /*each_value*/ ctx[13], /*item_index*/ ctx[14]);
    	}

    	let listitem_props = {};

    	if (/*item*/ ctx[12] !== void 0) {
    		listitem_props.item = /*item*/ ctx[12];
    	}

    	listitem = new ListItem({ props: listitem_props, $$inline: true });
    	binding_callbacks.push(() => bind(listitem, 'item', listitem_item_binding));

    	const block = {
    		c: function create() {
    			p = element("p");
    			create_component(listitem.$$.fragment);
    			add_location(p, file$4, 20, 2, 414);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			mount_component(listitem, p, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const listitem_changes = {};

    			if (!updating_item && dirty & /*$items*/ 8) {
    				updating_item = true;
    				listitem_changes.item = /*item*/ ctx[12];
    				add_flush_callback(() => updating_item = false);
    			}

    			listitem.$set(listitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(listitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(listitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			destroy_component(listitem);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(20:2) {#each [...$items] as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let main;
    	let div1;
    	let t0;
    	let div0;
    	let input0;
    	let t1;
    	let input1;
    	let t2;
    	let label0;
    	let input2;
    	let t3;
    	let t4;
    	let label1;
    	let input3;
    	let t5;
    	let t6;
    	let label2;
    	let input4;
    	let t7;
    	let t8;
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = [.../*$items*/ ctx[3]];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t1 = space();
    			input1 = element("input");
    			t2 = space();
    			label0 = element("label");
    			input2 = element("input");
    			t3 = text("\n\t\t\t\tAnzahl");
    			t4 = space();
    			label1 = element("label");
    			input3 = element("input");
    			t5 = text("\n\t\t\t\tGramm");
    			t6 = space();
    			label2 = element("label");
    			input4 = element("input");
    			t7 = text("\n\t\t\t\tMilliliter");
    			t8 = space();
    			button = element("button");
    			button.textContent = "Submit Item";
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$4, 25, 3, 492);
    			attr_dev(input1, "type", "number");
    			add_location(input1, file$4, 26, 6, 539);
    			attr_dev(input2, "type", "radio");
    			attr_dev(input2, "name", "unit");
    			input2.__value = "";
    			input2.value = input2.__value;
    			/*$$binding_groups*/ ctx[9][0].push(input2);
    			add_location(input2, file$4, 28, 4, 596);
    			add_location(label0, file$4, 27, 3, 584);
    			attr_dev(input3, "type", "radio");
    			attr_dev(input3, "name", "unit");
    			input3.__value = "g";
    			input3.value = input3.__value;
    			/*$$binding_groups*/ ctx[9][0].push(input3);
    			add_location(input3, file$4, 32, 4, 707);
    			attr_dev(label1, "class", "main");
    			add_location(label1, file$4, 31, 3, 682);
    			attr_dev(input4, "type", "radio");
    			attr_dev(input4, "name", "unit");
    			input4.__value = "ml";
    			input4.value = input4.__value;
    			/*$$binding_groups*/ ctx[9][0].push(input4);
    			add_location(input4, file$4, 36, 4, 818);
    			attr_dev(label2, "class", "main");
    			add_location(label2, file$4, 35, 3, 793);
    			add_location(button, file$4, 39, 3, 910);
    			attr_dev(div0, "class", "main");
    			add_location(div0, file$4, 24, 2, 470);
    			add_location(div1, file$4, 18, 1, 376);
    			attr_dev(main, "class", "svelte-1gl58ci");
    			add_location(main, file$4, 17, 0, 368);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*newItem*/ ctx[0]);
    			append_dev(div0, t1);
    			append_dev(div0, input1);
    			set_input_value(input1, /*amount*/ ctx[2]);
    			append_dev(div0, t2);
    			append_dev(div0, label0);
    			append_dev(label0, input2);
    			input2.checked = input2.__value === /*unit*/ ctx[1];
    			append_dev(label0, t3);
    			append_dev(div0, t4);
    			append_dev(div0, label1);
    			append_dev(label1, input3);
    			input3.checked = input3.__value === /*unit*/ ctx[1];
    			append_dev(label1, t5);
    			append_dev(div0, t6);
    			append_dev(div0, label2);
    			append_dev(label2, input4);
    			input4.checked = input4.__value === /*unit*/ ctx[1];
    			append_dev(label2, t7);
    			append_dev(div0, t8);
    			append_dev(div0, button);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[8]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[10]),
    					listen_dev(input4, "change", /*input4_change_handler*/ ctx[11]),
    					listen_dev(button, "click", /*addToItems*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$items*/ 8) {
    				each_value = [.../*$items*/ ctx[3]];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, t0);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*newItem*/ 1 && input0.value !== /*newItem*/ ctx[0]) {
    				set_input_value(input0, /*newItem*/ ctx[0]);
    			}

    			if (dirty & /*amount*/ 4 && to_number(input1.value) !== /*amount*/ ctx[2]) {
    				set_input_value(input1, /*amount*/ ctx[2]);
    			}

    			if (dirty & /*unit*/ 2) {
    				input2.checked = input2.__value === /*unit*/ ctx[1];
    			}

    			if (dirty & /*unit*/ 2) {
    				input3.checked = input3.__value === /*unit*/ ctx[1];
    			}

    			if (dirty & /*unit*/ 2) {
    				input4.checked = input4.__value === /*unit*/ ctx[1];
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			/*$$binding_groups*/ ctx[9][0].splice(/*$$binding_groups*/ ctx[9][0].indexOf(input2), 1);
    			/*$$binding_groups*/ ctx[9][0].splice(/*$$binding_groups*/ ctx[9][0].indexOf(input3), 1);
    			/*$$binding_groups*/ ctx[9][0].splice(/*$$binding_groups*/ ctx[9][0].indexOf(input4), 1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $items;
    	validate_store(items, 'items');
    	component_subscribe($$self, items, $$value => $$invalidate(3, $items = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('EinkaufsListe', slots, []);
    	let newItem;
    	let unit = "";
    	let amount = 0;

    	const addToItems = () => {
    		items.update(items => {
    			items.set(newItem, newItem + " " + amount + " " + unit);
    			$$invalidate(0, newItem = "");
    			$$invalidate(2, amount = 0);
    			return items;
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<EinkaufsListe> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function listitem_item_binding(value, item, each_value, item_index) {
    		each_value[item_index] = value;
    		items.set($items);
    	}

    	function input0_input_handler() {
    		newItem = this.value;
    		$$invalidate(0, newItem);
    	}

    	function input1_input_handler() {
    		amount = to_number(this.value);
    		$$invalidate(2, amount);
    	}

    	function input2_change_handler() {
    		unit = this.__value;
    		$$invalidate(1, unit);
    	}

    	function input3_change_handler() {
    		unit = this.__value;
    		$$invalidate(1, unit);
    	}

    	function input4_change_handler() {
    		unit = this.__value;
    		$$invalidate(1, unit);
    	}

    	$$self.$capture_state = () => ({
    		fade,
    		fly,
    		ListItem,
    		items,
    		newItem,
    		unit,
    		amount,
    		addToItems,
    		$items
    	});

    	$$self.$inject_state = $$props => {
    		if ('newItem' in $$props) $$invalidate(0, newItem = $$props.newItem);
    		if ('unit' in $$props) $$invalidate(1, unit = $$props.unit);
    		if ('amount' in $$props) $$invalidate(2, amount = $$props.amount);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		newItem,
    		unit,
    		amount,
    		$items,
    		addToItems,
    		listitem_item_binding,
    		input0_input_handler,
    		input1_input_handler,
    		input2_change_handler,
    		$$binding_groups,
    		input3_change_handler,
    		input4_change_handler
    	];
    }

    class EinkaufsListe extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EinkaufsListe",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/DayFocused.svelte generated by Svelte v3.55.1 */

    const file$3 = "src/DayFocused.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let div;
    	let h2;
    	let t0;
    	let t1;
    	let input;
    	let t2;
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			h2 = element("h2");
    			t0 = text(/*weekday*/ ctx[2]);
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			textarea = element("textarea");
    			attr_dev(h2, "class", "svelte-f7k16e");
    			add_location(h2, file$3, 7, 8, 113);
    			attr_dev(input, "type", "text");
    			add_location(input, file$3, 8, 8, 140);
    			attr_dev(textarea, "rows", "30");
    			attr_dev(textarea, "cols", "18");
    			add_location(textarea, file$3, 9, 8, 186);
    			attr_dev(div, "class", "svelte-f7k16e");
    			add_location(div, file$3, 6, 4, 99);
    			add_location(main, file$3, 5, 0, 88);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, h2);
    			append_dev(h2, t0);
    			append_dev(div, t1);
    			append_dev(div, input);
    			set_input_value(input, /*name*/ ctx[0]);
    			append_dev(div, t2);
    			append_dev(div, textarea);
    			set_input_value(textarea, /*content*/ ctx[1]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*weekday*/ 4) set_data_dev(t0, /*weekday*/ ctx[2]);

    			if (dirty & /*name*/ 1 && input.value !== /*name*/ ctx[0]) {
    				set_input_value(input, /*name*/ ctx[0]);
    			}

    			if (dirty & /*content*/ 2) {
    				set_input_value(textarea, /*content*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('DayFocused', slots, []);
    	let { weekday } = $$props;
    	let { name } = $$props;
    	let { content } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (weekday === undefined && !('weekday' in $$props || $$self.$$.bound[$$self.$$.props['weekday']])) {
    			console.warn("<DayFocused> was created without expected prop 'weekday'");
    		}

    		if (name === undefined && !('name' in $$props || $$self.$$.bound[$$self.$$.props['name']])) {
    			console.warn("<DayFocused> was created without expected prop 'name'");
    		}

    		if (content === undefined && !('content' in $$props || $$self.$$.bound[$$self.$$.props['content']])) {
    			console.warn("<DayFocused> was created without expected prop 'content'");
    		}
    	});

    	const writable_props = ['weekday', 'name', 'content'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DayFocused> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function textarea_input_handler() {
    		content = this.value;
    		$$invalidate(1, content);
    	}

    	$$self.$$set = $$props => {
    		if ('weekday' in $$props) $$invalidate(2, weekday = $$props.weekday);
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('content' in $$props) $$invalidate(1, content = $$props.content);
    	};

    	$$self.$capture_state = () => ({ weekday, name, content });

    	$$self.$inject_state = $$props => {
    		if ('weekday' in $$props) $$invalidate(2, weekday = $$props.weekday);
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('content' in $$props) $$invalidate(1, content = $$props.content);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, content, weekday, input_input_handler, textarea_input_handler];
    }

    class DayFocused extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { weekday: 2, name: 0, content: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayFocused",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get weekday() {
    		throw new Error("<DayFocused>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set weekday(value) {
    		throw new Error("<DayFocused>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<DayFocused>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<DayFocused>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get content() {
    		throw new Error("<DayFocused>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<DayFocused>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Day.svelte generated by Svelte v3.55.1 */

    const file$2 = "src/Day.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let div;
    	let input;
    	let t;
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			input = element("input");
    			t = space();
    			textarea = element("textarea");
    			attr_dev(input, "class", "title svelte-qb5p3u");
    			attr_dev(input, "type", "text");
    			add_location(input, file$2, 7, 8, 113);
    			attr_dev(textarea, "rows", "30");
    			attr_dev(textarea, "cols", "18");
    			attr_dev(textarea, "class", "svelte-qb5p3u");
    			add_location(textarea, file$2, 8, 8, 173);
    			attr_dev(div, "class", "svelte-qb5p3u");
    			add_location(div, file$2, 6, 4, 99);
    			add_location(main, file$2, 5, 0, 88);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, input);
    			set_input_value(input, /*name*/ ctx[0]);
    			append_dev(div, t);
    			append_dev(div, textarea);
    			set_input_value(textarea, /*content*/ ctx[1]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && input.value !== /*name*/ ctx[0]) {
    				set_input_value(input, /*name*/ ctx[0]);
    			}

    			if (dirty & /*content*/ 2) {
    				set_input_value(textarea, /*content*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Day', slots, []);
    	let { weekday } = $$props;
    	let { name } = $$props;
    	let { content } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (weekday === undefined && !('weekday' in $$props || $$self.$$.bound[$$self.$$.props['weekday']])) {
    			console.warn("<Day> was created without expected prop 'weekday'");
    		}

    		if (name === undefined && !('name' in $$props || $$self.$$.bound[$$self.$$.props['name']])) {
    			console.warn("<Day> was created without expected prop 'name'");
    		}

    		if (content === undefined && !('content' in $$props || $$self.$$.bound[$$self.$$.props['content']])) {
    			console.warn("<Day> was created without expected prop 'content'");
    		}
    	});

    	const writable_props = ['weekday', 'name', 'content'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Day> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	function textarea_input_handler() {
    		content = this.value;
    		$$invalidate(1, content);
    	}

    	$$self.$$set = $$props => {
    		if ('weekday' in $$props) $$invalidate(2, weekday = $$props.weekday);
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('content' in $$props) $$invalidate(1, content = $$props.content);
    	};

    	$$self.$capture_state = () => ({ weekday, name, content });

    	$$self.$inject_state = $$props => {
    		if ('weekday' in $$props) $$invalidate(2, weekday = $$props.weekday);
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('content' in $$props) $$invalidate(1, content = $$props.content);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, content, weekday, input_input_handler, textarea_input_handler];
    }

    class Day extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { weekday: 2, name: 0, content: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Day",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get weekday() {
    		throw new Error("<Day>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set weekday(value) {
    		throw new Error("<Day>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Day>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Day>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get content() {
    		throw new Error("<Day>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<Day>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/WochenPlan.svelte generated by Svelte v3.55.1 */

    const { console: console_1 } = globals;
    const file$1 = "src/WochenPlan.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[12] = list;
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (32:12) {#each [...$plan] as p}
    function create_each_block(ctx) {
    	let li;
    	let button;
    	let t0_value = /*p*/ ctx[11].weekday + "";
    	let t0;
    	let t1;
    	let dayrecipe;
    	let updating_weekday;
    	let updating_name;
    	let updating_content;
    	let t2;
    	let current;
    	let mounted;
    	let dispose;

    	function dayrecipe_weekday_binding(value) {
    		/*dayrecipe_weekday_binding*/ ctx[5](value, /*p*/ ctx[11]);
    	}

    	function dayrecipe_name_binding(value) {
    		/*dayrecipe_name_binding*/ ctx[6](value, /*p*/ ctx[11]);
    	}

    	function dayrecipe_content_binding(value) {
    		/*dayrecipe_content_binding*/ ctx[7](value, /*p*/ ctx[11]);
    	}

    	let dayrecipe_props = {};

    	if (/*p*/ ctx[11].weekday !== void 0) {
    		dayrecipe_props.weekday = /*p*/ ctx[11].weekday;
    	}

    	if (/*p*/ ctx[11].name !== void 0) {
    		dayrecipe_props.name = /*p*/ ctx[11].name;
    	}

    	if (/*p*/ ctx[11].content !== void 0) {
    		dayrecipe_props.content = /*p*/ ctx[11].content;
    	}

    	dayrecipe = new Day({ props: dayrecipe_props, $$inline: true });
    	binding_callbacks.push(() => bind(dayrecipe, 'weekday', dayrecipe_weekday_binding));
    	binding_callbacks.push(() => bind(dayrecipe, 'name', dayrecipe_name_binding));
    	binding_callbacks.push(() => bind(dayrecipe, 'content', dayrecipe_content_binding));

    	const block = {
    		c: function create() {
    			li = element("li");
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(dayrecipe.$$.fragment);
    			t2 = space();
    			attr_dev(button, "class", "setButton svelte-1ds9uwf");
    			add_location(button, file$1, 33, 20, 797);
    			attr_dev(li, "class", "weekdays svelte-1ds9uwf");
    			add_location(li, file$1, 32, 16, 755);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, button);
    			append_dev(button, t0);
    			append_dev(li, t1);
    			mount_component(dayrecipe, li, null);
    			append_dev(li, t2);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*setFocusedDay*/ ctx[4](/*p*/ ctx[11].weekday, /*p*/ ctx[11].name, /*p*/ ctx[11].content))) /*setFocusedDay*/ ctx[4](/*p*/ ctx[11].weekday, /*p*/ ctx[11].name, /*p*/ ctx[11].content).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*$plan*/ 4) && t0_value !== (t0_value = /*p*/ ctx[11].weekday + "")) set_data_dev(t0, t0_value);
    			const dayrecipe_changes = {};

    			if (!updating_weekday && dirty & /*$plan*/ 4) {
    				updating_weekday = true;
    				dayrecipe_changes.weekday = /*p*/ ctx[11].weekday;
    				add_flush_callback(() => updating_weekday = false);
    			}

    			if (!updating_name && dirty & /*$plan*/ 4) {
    				updating_name = true;
    				dayrecipe_changes.name = /*p*/ ctx[11].name;
    				add_flush_callback(() => updating_name = false);
    			}

    			if (!updating_content && dirty & /*$plan*/ 4) {
    				updating_content = true;
    				dayrecipe_changes.content = /*p*/ ctx[11].content;
    				add_flush_callback(() => updating_content = false);
    			}

    			dayrecipe.$set(dayrecipe_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayrecipe.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayrecipe.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(dayrecipe);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(32:12) {#each [...$plan] as p}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let div0;
    	let ul;
    	let t0;
    	let t1;
    	let div1;
    	let dayfocused;
    	let updating_weekday;
    	let updating_name;
    	let updating_content;
    	let div1_hidden_value;
    	let t2;
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = [.../*$plan*/ ctx[2]];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	function dayfocused_weekday_binding(value) {
    		/*dayfocused_weekday_binding*/ ctx[8](value);
    	}

    	function dayfocused_name_binding(value) {
    		/*dayfocused_name_binding*/ ctx[9](value);
    	}

    	function dayfocused_content_binding(value) {
    		/*dayfocused_content_binding*/ ctx[10](value);
    	}

    	let dayfocused_props = {};

    	if (/*focusedDay*/ ctx[1].weekday !== void 0) {
    		dayfocused_props.weekday = /*focusedDay*/ ctx[1].weekday;
    	}

    	if (/*focusedDay*/ ctx[1].name !== void 0) {
    		dayfocused_props.name = /*focusedDay*/ ctx[1].name;
    	}

    	if (/*focusedDay*/ ctx[1].content !== void 0) {
    		dayfocused_props.content = /*focusedDay*/ ctx[1].content;
    	}

    	dayfocused = new DayFocused({ props: dayfocused_props, $$inline: true });
    	binding_callbacks.push(() => bind(dayfocused, 'weekday', dayfocused_weekday_binding));
    	binding_callbacks.push(() => bind(dayfocused, 'name', dayfocused_name_binding));
    	binding_callbacks.push(() => bind(dayfocused, 'content', dayfocused_content_binding));

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			ul = element("ul");
    			t0 = text("s\n            ");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			div1 = element("div");
    			create_component(dayfocused.$$.fragment);
    			t2 = space();
    			button = element("button");
    			button.textContent = "Reset Focus";
    			attr_dev(ul, "class", "container svelte-1ds9uwf");
    			add_location(ul, file$1, 30, 8, 679);
    			div0.hidden = /*showFocus*/ ctx[0];
    			add_location(div0, file$1, 29, 4, 646);
    			div1.hidden = div1_hidden_value = !/*showFocus*/ ctx[0];
    			add_location(div1, file$1, 42, 4, 1123);
    			add_location(button, file$1, 46, 4, 1302);
    			add_location(main, file$1, 28, 0, 635);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, ul);
    			append_dev(ul, t0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(main, t1);
    			append_dev(main, div1);
    			mount_component(dayfocused, div1, null);
    			append_dev(main, t2);
    			append_dev(main, button);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*set*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$plan, setFocusedDay*/ 20) {
    				each_value = [.../*$plan*/ ctx[2]];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*showFocus*/ 1) {
    				prop_dev(div0, "hidden", /*showFocus*/ ctx[0]);
    			}

    			const dayfocused_changes = {};

    			if (!updating_weekday && dirty & /*focusedDay*/ 2) {
    				updating_weekday = true;
    				dayfocused_changes.weekday = /*focusedDay*/ ctx[1].weekday;
    				add_flush_callback(() => updating_weekday = false);
    			}

    			if (!updating_name && dirty & /*focusedDay*/ 2) {
    				updating_name = true;
    				dayfocused_changes.name = /*focusedDay*/ ctx[1].name;
    				add_flush_callback(() => updating_name = false);
    			}

    			if (!updating_content && dirty & /*focusedDay*/ 2) {
    				updating_content = true;
    				dayfocused_changes.content = /*focusedDay*/ ctx[1].content;
    				add_flush_callback(() => updating_content = false);
    			}

    			dayfocused.$set(dayfocused_changes);

    			if (!current || dirty & /*showFocus*/ 1 && div1_hidden_value !== (div1_hidden_value = !/*showFocus*/ ctx[0])) {
    				prop_dev(div1, "hidden", div1_hidden_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(dayfocused.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(dayfocused.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			destroy_component(dayfocused);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const rows = 33;

    function instance$1($$self, $$props, $$invalidate) {
    	let $plan;
    	validate_store(plan, 'plan');
    	component_subscribe($$self, plan, $$value => $$invalidate(2, $plan = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WochenPlan', slots, []);
    	let showFocus = false;
    	let focusedDay = { weekday: "", name: "", content: "" };

    	const set = () => {
    		console.log(showFocus);
    		$$invalidate(0, showFocus = false);
    	};

    	function setFocusedDay(weekday, name, content) {
    		console.log(showFocus);
    		$$invalidate(0, showFocus = true);
    		$$invalidate(1, focusedDay.weekday = weekday, focusedDay);
    		$$invalidate(1, focusedDay.name = name, focusedDay);
    		$$invalidate(1, focusedDay.content = content, focusedDay);
    		console.log(name);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<WochenPlan> was created with unknown prop '${key}'`);
    	});

    	function dayrecipe_weekday_binding(value, p) {
    		if ($$self.$$.not_equal(p.weekday, value)) {
    			p.weekday = value;
    			plan.set($plan);
    		}
    	}

    	function dayrecipe_name_binding(value, p) {
    		if ($$self.$$.not_equal(p.name, value)) {
    			p.name = value;
    			plan.set($plan);
    		}
    	}

    	function dayrecipe_content_binding(value, p) {
    		if ($$self.$$.not_equal(p.content, value)) {
    			p.content = value;
    			plan.set($plan);
    		}
    	}

    	function dayfocused_weekday_binding(value) {
    		if ($$self.$$.not_equal(focusedDay.weekday, value)) {
    			focusedDay.weekday = value;
    			$$invalidate(1, focusedDay);
    		}
    	}

    	function dayfocused_name_binding(value) {
    		if ($$self.$$.not_equal(focusedDay.name, value)) {
    			focusedDay.name = value;
    			$$invalidate(1, focusedDay);
    		}
    	}

    	function dayfocused_content_binding(value) {
    		if ($$self.$$.not_equal(focusedDay.content, value)) {
    			focusedDay.content = value;
    			$$invalidate(1, focusedDay);
    		}
    	}

    	$$self.$capture_state = () => ({
    		DayFocused,
    		DayRecipe: Day,
    		plan,
    		rows,
    		showFocus,
    		focusedDay,
    		set,
    		setFocusedDay,
    		$plan
    	});

    	$$self.$inject_state = $$props => {
    		if ('showFocus' in $$props) $$invalidate(0, showFocus = $$props.showFocus);
    		if ('focusedDay' in $$props) $$invalidate(1, focusedDay = $$props.focusedDay);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		showFocus,
    		focusedDay,
    		$plan,
    		set,
    		setFocusedDay,
    		dayrecipe_weekday_binding,
    		dayrecipe_name_binding,
    		dayrecipe_content_binding,
    		dayfocused_weekday_binding,
    		dayfocused_name_binding,
    		dayfocused_content_binding
    	];
    }

    class WochenPlan extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WochenPlan",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.55.1 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div2;
    	let div0;
    	let h10;
    	let t1;
    	let wochenplan;
    	let t2;
    	let div1;
    	let h11;
    	let t4;
    	let einkaufsliste;
    	let t5;
    	let button;
    	let current;
    	wochenplan = new WochenPlan({ $$inline: true });
    	einkaufsliste = new EinkaufsListe({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			div2 = element("div");
    			div0 = element("div");
    			h10 = element("h1");
    			h10.textContent = "WochenPlan";
    			t1 = space();
    			create_component(wochenplan.$$.fragment);
    			t2 = space();
    			div1 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Liste";
    			t4 = space();
    			create_component(einkaufsliste.$$.fragment);
    			t5 = space();
    			button = element("button");
    			button.textContent = "Submit Plan Changes";
    			attr_dev(h10, "class", "svelte-1ea96sq");
    			add_location(h10, file, 6, 3, 183);
    			attr_dev(div0, "class", "plan svelte-1ea96sq");
    			add_location(div0, file, 5, 2, 160);
    			attr_dev(h11, "class", "svelte-1ea96sq");
    			add_location(h11, file, 11, 3, 269);
    			attr_dev(div1, "class", "liste svelte-1ea96sq");
    			add_location(div1, file, 10, 2, 246);
    			attr_dev(div2, "class", "container svelte-1ea96sq");
    			add_location(div2, file, 4, 1, 134);
    			add_location(button, file, 18, 1, 343);
    			attr_dev(main, "class", "svelte-1ea96sq");
    			add_location(main, file, 3, 0, 126);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h10);
    			append_dev(div0, t1);
    			mount_component(wochenplan, div0, null);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, h11);
    			append_dev(div1, t4);
    			mount_component(einkaufsliste, div1, null);
    			append_dev(main, t5);
    			append_dev(main, button);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wochenplan.$$.fragment, local);
    			transition_in(einkaufsliste.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wochenplan.$$.fragment, local);
    			transition_out(einkaufsliste.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(wochenplan);
    			destroy_component(einkaufsliste);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ EinkaufsListe, WochenPlan });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
