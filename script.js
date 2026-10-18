const main = document.querySelector("main");

function restoreStyle(element, style) {
    if (style === null) element.removeAttribute("style");
    else element.setAttribute("style", style);
}

// Цвета страницы.
const themeControls = document.querySelector("#theme-controls");
const root = document.documentElement;
const rootStyle = getComputedStyle(root);
const themeInputs = [...themeControls.querySelectorAll("[data-variable]")];
const themeDefaults = new Map();

for (const name of themeInputs.map(input => input.dataset.variable)) {
    themeDefaults.set(name, {
        value: rootStyle.getPropertyValue(name).trim(),
        inlineValue: root.style.getPropertyValue(name),
        priority: root.style.getPropertyPriority(name)
    });
}

function colorPickerValue(value) {
    const hex = value.slice(1);
    return "#" + (hex.length <= 4
        ? [...hex.slice(0, 3)].map(char => char + char).join("")
        : hex.slice(0, 6));
}

function setThemeValue(name, value) {
    root.style.setProperty(name, value);
}

function resetTheme() {
    for (const [name, { inlineValue, priority }] of themeDefaults) {
        if (inlineValue) root.style.setProperty(name, inlineValue, priority);
        else root.style.removeProperty(name);
    }
    for (const input of themeInputs) {
        input.value = colorPickerValue(themeDefaults.get(input.dataset.variable).value);
    }
}

function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

// Кнопка 1
const funnyButton = document.querySelector("#funny-button");
const funnyControls = document.querySelector(".funny-controls");
const funnyButtons = [...funnyControls.querySelectorAll(".funny-button")];
const funnyHighlightTimers = new Map();

function highlightFunnyButtons(event) {
    event.preventDefault();
    funnyControls.scrollIntoView({ block: "center" });
    funnyButtons.forEach(target => {
        clearTimeout(funnyHighlightTimers.get(target));
        target.classList.add("is-highlighted");
        funnyHighlightTimers.set(target, setTimeout(() => {
            target.classList.remove("is-highlighted");
            funnyHighlightTimers.delete(target);
        }, 3000));
    });
}

function setFunnyMode(enabled) {
    document.body.classList.toggle("funny-mode", enabled);
    funnyButton.setAttribute("aria-pressed", String(enabled));
}

const fallingButton = document.querySelector("#funny-button-2");
let fallingPieces = [];
let fallingFrame;
let fallingTime = 0;
let fallingScroll = 0;

function stopFalling() {
    cancelAnimationFrame(fallingFrame);
    for (const piece of fallingPieces) {
        piece.el.classList.remove("falling-piece");
        restoreStyle(piece.el, piece.style);
    }
    fallingPieces = [];
    document.body.classList.remove("falling-mode");
    fallingButton.setAttribute("aria-pressed", "false");
    window.scrollTo({ top: fallingScroll, behavior: "instant" });
}

function resolvePieces(a, b) {
    // Находим перекрытие двух прямоугольников и раздвигаем их.
    const dx = b.x + b.w / 2 - a.x - a.w / 2;
    const dy = b.y + b.h / 2 - a.y - a.h / 2;
    const ox = (a.w + b.w) / 2 - Math.abs(dx);
    const oy = (a.h + b.h) / 2 - Math.abs(dy);
    if (ox <= 0 || oy <= 0) return;
    const nx = ox < oy ? (dx >= 0 ? 1 : -1) : 0;
    const ny = ox < oy ? 0 : (dy >= 0 ? 1 : -1);
    const push = (Math.min(ox, oy) + 0.1) / 2;
    a.x -= nx * push;
    b.x += nx * push;
    a.y -= ny * push;
    b.y += ny * push;
    const speed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (speed < 0) {
        const impulse = -speed * 0.6;
        a.vx -= nx * impulse;
        b.vx += nx * impulse;
        a.vy -= ny * impulse;
        b.vy += ny * impulse;
    }
}

function constrainFallingPiece(piece) {
    if (piece.x < 0) {
        piece.x = 0;
        piece.vx = Math.abs(piece.vx) * 0.4;
    }
    if (piece.x + piece.w > innerWidth) {
        piece.x = Math.max(0, innerWidth - piece.w);
        piece.vx = -Math.abs(piece.vx) * 0.4;
    }
    if (piece.y + piece.h > innerHeight) {
        piece.y = innerHeight - piece.h;
        piece.vy = -Math.abs(piece.vy) * 0.15;
    }
}

function drawFalling(time) {
    // dt — время кадра в секундах. Ограничение защищает физику после паузы вкладки.
    const dt = Math.min((time - fallingTime) / 1000 || 0, 0.025);
    fallingTime = time;
    const damping = Math.exp(-0.6 * dt);
    for (const piece of fallingPieces) {
        piece.vy += 900 * dt;
        piece.vx *= damping;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
    }
    for (let pass = 0; pass < 6; pass++) {
        for (let i = 0; i < fallingPieces.length; i++) {
            for (let j = i + 1; j < fallingPieces.length; j++) {
                resolvePieces(fallingPieces[i], fallingPieces[j]);
            }
        }
        for (const piece of fallingPieces) {
            constrainFallingPiece(piece);
        }
    }
    for (const piece of fallingPieces) {
        piece.el.style.transform = `translate(${piece.x}px, ${piece.y}px)`;
    }
    fallingFrame = requestAnimationFrame(drawFalling);
}

function startFalling() {
    if (document.body.classList.contains("falling-mode")) {
        stopFalling();
        return;
    }
    setFunnyMode(false);
    fallingScroll = window.scrollY;
    const elements = [...document.querySelectorAll(
        ".navigation a, .intro h1, .intro p, .profile-card, " +
        ".content-section > h2, .skill-panel, .achievement, .footer-name, .footer-note, " +
        ".footer-links a, .funny-controls .funny-button, .theme-controls"
    )];
    // Сначала измеряем все элементы, затем меняем их расположение.
    fallingPieces = elements.map((el, index) => {
        const rect = el.getBoundingClientRect();
        const w = Math.min(rect.width, innerWidth - 16);
        return {
            el, style: el.getAttribute("style"), w, h: rect.height,
            x: Math.max(0, Math.min(rect.left, innerWidth - w)),
            y: rect.top >= 0 && rect.bottom <= innerHeight
                ? rect.top : -rect.height - index * 95,
            vx: (Math.random() - 0.5) * 160, vy: 0
        };
    });
    document.body.classList.add("falling-mode");
    for (const piece of fallingPieces) {
        piece.el.classList.add("falling-piece");
        Object.assign(piece.el.style, {
            left: "0px", top: "0px", width: `${piece.w}px`, height: `${piece.h}px`,
            transform: `translate(${piece.x}px, ${piece.y}px)`
        });
    }
    fallingButton.setAttribute("aria-pressed", "true");
    fallingTime = 0;
    fallingFrame = requestAnimationFrame(drawFalling);
}

// Кнопка 3
const explosionButton = document.querySelector("#funny-button-3");
let screenExplosionTimer;
function stopScreenExplosion() {
    clearTimeout(screenExplosionTimer);
    document.querySelector(".screen-explosion")?.remove();
    document.querySelectorAll(".flying-avatar").forEach(avatar => {
        avatar.getAnimations().forEach(animation => animation.cancel());
        avatar.remove();
    });
    document.body.classList.remove("explosion-mode");
    explosionButton.setAttribute("aria-pressed", "false");
}
function launchAvatars() {
    const cards = [...document.querySelectorAll(".profile-card")];
    const count = 18;
    const diagonal = Math.hypot(innerWidth, innerHeight);
    for (let i = 0; i < count; i++) {
        const avatar = document.createElement("div");
        avatar.className = "flying-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.style.backgroundImage = cards[i % cards.length].style
            .getPropertyValue("--profile-avatar");
        const size = 42 + Math.random() * 42;
        avatar.style.width = `${size}px`;
        avatar.style.height = `${size}px`;
        document.body.appendChild(avatar);

        const angle = i / count * Math.PI * 2 + Math.random() * 0.2;
        const distance = diagonal * (0.4 + Math.random() * 0.3);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const rotation = (Math.random() - 0.5) * 1080;
        const animation = avatar.animate([
            { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0 },
            { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.08 },
            {
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg) scale(0.6)`,
                opacity: 0
            }
        ], { duration: 1600, easing: "cubic-bezier(0.12, 0.65, 0.3, 1)", fill: "forwards" });
        animation.onfinish = () => avatar.remove();
    }
}
function startScreenExplosion() {
    stopScreenExplosion();
    const explosion = document.createElement("img");
    explosion.className = "screen-explosion";
    explosion.alt = "";
    explosion.setAttribute("aria-hidden", "true");
    explosion.addEventListener("load", () => {
        launchAvatars();
        screenExplosionTimer = setTimeout(stopScreenExplosion, 1800);
    }, { once: true });
    explosion.addEventListener("error", stopScreenExplosion, { once: true });
    explosion.src = "explosion.gif";
    document.body.appendChild(explosion);
    document.body.classList.add("explosion-mode");
    explosionButton.setAttribute("aria-pressed", "true");
}

// Кнопка 4
const shuffleButton = document.querySelector("#funny-button-4");
const shuffleCancel = document.querySelector("#shuffle-cancel");
let shuffledStyles = [];
let shuffledSlots = [];
let shuffledInputs = [];
let shuffledTexts = [];
// Map связывает каждую кнопку с её новым действием, не удаляя обработчики.
let shuffledActions = new Map();
let forwardingClick = false;

function stopShuffle() {
    for (const [slot, element] of shuffledSlots) slot.replaceWith(element);
    for (const [element, style] of shuffledStyles) {
        restoreStyle(element, style);
    }
    for (const [input, value] of shuffledInputs) input.value = value;
    for (const [node, text] of shuffledTexts) node.nodeValue = text;
    shuffledSlots = [];
    shuffledStyles = [];
    shuffledInputs = [];
    shuffledTexts = [];
    shuffleCancel.hidden = true;
    shuffledActions.clear();
    shuffleButton.setAttribute("aria-pressed", "false");
}

function shufflePageText() {
    // Обходим текстовые узлы: вложенные ссылки, иконки и обработчики остаются на месте.
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeValue.trim() && !node.parentElement.closest("script, style")) {
            shuffledTexts.push([node, node.nodeValue]);
        }
    }
    const texts = shuffle(shuffledTexts.map(([, text]) => text));
    shuffledTexts.forEach(([node], index) => { node.nodeValue = texts[index]; });
}

function shufflePageActions() {
    const buttons = [...document.querySelectorAll("a[href], button")]
        .filter(button => button !== shuffleCancel);
    const actions = shuffle([...buttons]);
    shuffledActions = new Map(buttons.map((button, index) => [button, actions[index]]));
}

function shufflePageBlocks() {
    // Слоты запоминают исходные места, даже когда блоки вложены друг в друга.
    for (const parent of document.querySelectorAll(
        "main, .navigation-links, .profile-links, .skills-grid, .achievement-list, .funny-controls, .footer-links, .award-links"
    )) {
        const children = [...parent.children];
        const slots = children.map(element => {
            const slot = document.createComment("shuffle");
            element.before(slot);
            shuffledSlots.push([slot, element]);
            return slot;
        });
        shuffle(children).forEach((element, index) => slots[index].after(element));
    }
}

// Правила хаоса собраны в одном месте: каждое свойство получает случайное значение.
function shufflePageStyles(elements) {
    const pick = values => values[Math.floor(Math.random() * values.length)];
    const number = (min, max) => min + Math.random() * (max - min);
    const color = () => `hsl(${number(0, 360)} 85% ${number(35, 75)}%)`;

    for (const name of ["--background", "--backgroundText", "--color", "--textColor", "--text", "--accent"]) {
        root.style.setProperty(name, color());
    }
    root.style.setProperty("--workspace-width", `${number(600, 1600)}px`);

    for (const element of elements) {
        Object.assign(element.style, {
            color: color(),
            background: pick([color(), `linear-gradient(${number(0, 360)}deg, ${color()}, ${color()})`, "transparent"]),
            fontFamily: pick(["monospace", "serif", "sans-serif", "cursive", "fantasy"]),
            fontSize: `${number(9, 54)}px`,
            fontWeight: pick(["300", "400", "700", "900"]),
            fontStyle: pick(["normal", "italic"]),
            letterSpacing: `${number(-2, 8)}px`,
            lineHeight: number(0.8, 2).toFixed(2),
            textAlign: pick(["left", "center", "right", "justify"]),
            textTransform: pick(["none", "uppercase", "lowercase"]),
            textDecoration: pick(["none", "underline", "line-through", "overline"]),
            textShadow: `${number(-6, 6)}px ${number(-6, 6)}px 4px ${color()}`,
            display: pick(["block", "inline-block", "flex", "grid"]),
            flexDirection: pick(["row", "column", "row-reverse", "column-reverse"]),
            flexWrap: pick(["wrap", "nowrap"]),
            justifyContent: pick(["flex-start", "center", "space-around", "space-between"]),
            alignItems: pick(["start", "center", "end", "stretch"]),
            gridTemplateColumns: `repeat(${pick([1, 2, 3])}, minmax(0, 1fr))`,
            gap: `${number(0, 40)}px`,
            width: pick(["auto", "50%", "100%", `${number(80, 400)}px`]),
            minWidth: "0",
            maxWidth: "none",
            height: pick(["auto", "auto", `${number(40, 240)}px`]),
            minHeight: "0",
            maxHeight: "none",
            margin: `${number(-15, 30)}px`,
            padding: `${number(0, 30)}px`,
            border: `${number(0, 8)}px ${pick(["solid", "dashed", "dotted", "double"])} ${color()}`,
            borderRadius: `${number(0, 60)}px`,
            boxShadow: `${number(-15, 15)}px ${number(-15, 15)}px ${number(0, 30)}px ${color()}`,
            transform: `translate(${number(-30, 30)}px, ${number(-20, 20)}px) rotate(${number(-25, 25)}deg) skew(${number(-10, 10)}deg)`,
            transformOrigin: pick(["center", "top left", "bottom right"]),
            filter: `hue-rotate(${number(0, 360)}deg) saturate(${number(0.5, 2)})`,
            opacity: number(0.75, 1).toFixed(2),
            overflow: "visible",
            transition: "none",
            animation: "none"
        });
    }
}

function startShuffle() {
    if (shuffledTexts.length) return stopShuffle();
    // Меняем только страницу внутри main. Кнопка «ОТМЕНА» находится снаружи.
    const styledElements = [main, ...main.querySelectorAll("*")];
    shuffledStyles = [root, ...styledElements]
        .map(element => [element, element.getAttribute("style")]);
    shuffledInputs = themeInputs.map(input => [input, input.value]);
    shufflePageText();
    shufflePageActions();
    shufflePageBlocks();
    shufflePageStyles(styledElements);
    shuffleCancel.hidden = false;
    shuffleCancel.focus({ preventScroll: true });
    shuffleButton.setAttribute("aria-pressed", "true");
}

function handleShuffleClick(event) {
    // Программный клик тоже попадает сюда. Флаг не даёт вызвать его по кругу.
    if (forwardingClick) return;
    const action = shuffledActions.get(event.target.closest("a, button"));
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    forwardingClick = true;
    try {
        action.click();
    } finally {
        forwardingClick = false;
    }
}

// Кнопка 5
const blackHoleButton = document.querySelector("#funny-button-5");
let blackHole;
let blackHoleActive = false;
let blackHoleAnimations = [];
let blackHolePieces = [];
let blackHoleInert = false;

function stopBlackHole() {
    if (!blackHoleActive) return;
    blackHoleActive = false;
    blackHoleAnimations.forEach(animation => animation.cancel());
    blackHolePieces.forEach(element => element.classList.remove("black-hole-piece"));
    blackHoleAnimations = [];
    blackHolePieces = [];
    blackHole?.remove();
    document.body.classList.remove("black-hole-mode");
    main.inert = blackHoleInert;
    blackHoleButton.setAttribute("aria-pressed", "false");
    shuffleCancel.hidden = !shuffledTexts.length;
    blackHoleButton.focus({ preventScroll: true });
}

// Полтора оборота: радиус и размер плавно уменьшаются до нуля.
function createBlackHoleFrames(dx, dy) {
    const frames = [];
    for (let index = 0; index <= 60; index++) {
        const progress = index / 60;
        const radiusFactor = Math.pow(1 - progress, 1.4);
        const angle = progress * Math.PI * 3;
        const cos = Math.cos(angle) * radiusFactor;
        const sin = Math.sin(angle) * radiusFactor;
        const shiftX = dx - dx * cos + dy * sin;
        const shiftY = dy - dx * sin - dy * cos;
        const rotation = progress * 540;
        const scale = Math.pow(1 - progress, 0.8);
        frames.push({
            transform: `translate(${shiftX}px, ${shiftY}px) rotate(${rotation}deg) scale(${scale})`,
            opacity: Math.min(1, (1 - progress) * 5),
            offset: progress
        });
    }
    return frames;
}

function startBlackHole() {
    if (blackHoleActive) return;
    setFunnyMode(false);
    if (document.body.classList.contains("falling-mode")) stopFalling();
    stopScreenExplosion();
    stopShuffle();
    const buttonRect = blackHoleButton.getBoundingClientRect();
    const x = buttonRect.left + buttonRect.width / 2;
    const y = buttonRect.top + buttonRect.height / 2;
    blackHolePieces = [...main.querySelectorAll(
        ".navigation a, .intro > *, .profile-card, .section-index, .content-section > h2, " +
        ".skill-panel, .achievement, .funny-controls button, .theme-controls, " +
        ".footer-name, .footer-note, .footer-links a"
    ), document.querySelector("#binary-rain")];
    // Все измерения выполняем до изменения оформления.
    const pieces = blackHolePieces.map(element => ({ element, rect: element.getBoundingClientRect() }));
    blackHoleActive = true;
    blackHoleInert = main.inert;
    main.inert = true;
    document.body.classList.add("black-hole-mode");
    blackHoleButton.setAttribute("aria-pressed", "true");
    blackHole = document.createElement("div");
    blackHole.className = "black-hole";
    blackHole.setAttribute("aria-hidden", "true");
    blackHole.style.left = `${x}px`;
    blackHole.style.top = `${y}px`;
    document.body.appendChild(blackHole);
    blackHoleAnimations.push(blackHole.animate([
        { transform: "scale(0) rotate(0deg)" },
        { transform: "scale(1) rotate(180deg)" }
    ], { duration: motionPreference.matches ? 1 : 700, fill: "forwards", easing: "ease-out" }));
    for (const { element, rect } of pieces) {
        element.classList.add("black-hole-piece");
        const dx = x - rect.left - rect.width / 2;
        const dy = y - rect.top - rect.height / 2;
        const distance = Math.hypot(dx, dy);
        const frames = createBlackHoleFrames(dx, dy);
        blackHoleAnimations.push(element.animate(frames, {
            duration: motionPreference.matches ? 1 : 2800 + Math.min(distance, 1600) * 0.5,
            delay: motionPreference.matches ? 0 : Math.random() * 450,
            easing: "linear", fill: "forwards"
        }));
    }
    shuffleCancel.hidden = false;
    shuffleCancel.focus({ preventScroll: true });
}

// Дождь из слов и ASCII-артов.
const canvas = document.querySelector("#binary-rain");
const ctx = canvas.getContext("2d");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const obstacles = [...document.querySelectorAll(".intro h1, .intro p, .profile-card")];
const rainWords = [
    "идеи", "проекты", "хочу зп большое",
    "кампутер", "уже лень",
    "это кто-то читает?", "random-text12", "гыгыгыгы",
    "error404", "localhost::8000", "???",
    "продам гараж +7...", "1", "0", "-_-", "фраза#1013", "сколько их тут?",
    "апчхи", "дайте оффер", "потенциально топ1", "10к баксов мне на карту",
    "мой CVC код 123", "мдэээ", "...", String.raw `¯\_(ツ)_/¯`, "=)", "шизааа", ">:D", ">:(", "пупупу",
    "как меня зовут?", "что вершит судьбу человечества в этом мире?", "вы кто такие?", "смешный фразы онлайн", "ой не туда",
    "маловато", "многовато", "потеха", "бублик", "трив. + очев.", "быть", "или не быть", 
    "очередной бред", "надо это удалить", "хомяк", "x86", "сааайт", "palindrom-mordnilap",
    "ssh username@server_ip", "Матадора, матадора", "sudo rm -rf",
    String.raw `купите мой ускоритель интернета 130р/мес 
            (не шутка в лс пишите)`,
    String.raw`        (__)
        (oo)
 /-------\/
/ |     ||
* /\---/\
  ~~   ~~`, String.raw` /\ /\
( o.o )
 (   )
  " "`, String.raw` .----.
 |o  o|
 | -- |
 '----'
 /|__|\
  d  b`,
];
let wordQueue = [];
let lastRainWord;
const rainLineHeight = 20;
const rainFont = "bold 16px monospace";
// Для каждой фразы один раз запоминаем строки, ширину и высоту.
const rainWordMetrics = new Map();

function measureRainWord(text) {
    if (!rainWordMetrics.has(text)) {
        const lines = text.split("\n");
        rainWordMetrics.set(text, {
            lines,
            halfWidth: Math.max(...lines.map(line => ctx.measureText(line).width)) / 2,
            halfHeight: lines.length * rainLineHeight / 2
        });
    }
    return rainWordMetrics.get(text);
}

function nextRainWord() {
    if (!wordQueue.length) {
        wordQueue = [...new Set(rainWords)];
        shuffle(wordQueue);
    }
    const activeWords = new Set(drops.map(drop => drop.text));
    const index = wordQueue.findIndex(text =>
        text !== lastRainWord && !activeWords.has(text));
    return index < 0 ? null : wordQueue[index];
}

let drops = [];
let width = 0;
let height = 0;
let previousTime = 0;
let spawnTime = 0;
let rainFrame;

function resizeRain() {
    width = window.innerWidth;
    height = window.innerHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function collideWords(a, b) {
    if (a.hasCollided || b.hasCollided) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const overlapX = a.halfWidth + b.halfWidth + 12 - Math.abs(dx);
    const overlapY = a.halfHeight + b.halfHeight + 8 - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) return;

    a.hasCollided = b.hasCollided = true;
    const horizontal = overlapX < overlapY;
    const nx = horizontal ? (dx >= 0 ? 1 : -1) : 0;
    const ny = horizontal ? 0 : (dy >= 0 ? 1 : -1);
    const correction = (horizontal ? overlapX : overlapY) / 2;
    a.x -= nx * correction;
    b.x += nx * correction;
    a.y -= ny * correction;
    b.y += ny * correction;

    // Меняем скорости только тогда, когда слова движутся навстречу.
    const closingSpeed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (closingSpeed < 0) {
        const impulse = -closingSpeed * 0.8;
        a.vx -= impulse * nx;
        b.vx += impulse * nx;
        a.vy -= impulse * ny;
        b.vy += impulse * ny;
        a.glow = b.glow = 0.5;
    }
}

function spawnRainDrops(dt) {
    spawnTime += dt;
    while (spawnTime >= 0.05 && drops.length < 180) {
        spawnTime -= 0.4;
        const text = nextRainWord();
        if (text === null) continue;
        const { lines, halfWidth, halfHeight } = measureRainWord(text);
        let spawnX;
        let clearSpace = false;
        for (let attempt = 0; attempt < 12; attempt++) {
            spawnX = halfWidth + Math.random() * Math.max(0, width - halfWidth * 2);
            clearSpace = drops.every(drop => drop.y - drop.halfHeight > 100 ||
                Math.abs(drop.x - spawnX) > halfWidth + drop.halfWidth + 40);
            if (clearSpace) break;
        }
        if (!clearSpace) continue;
        wordQueue.splice(wordQueue.indexOf(text), 1);
        lastRainWord = text;
        drops.push({
            x: spawnX,
            y: -halfHeight,
            vx: (Math.random() - 0.5) * 30,
            vy: 40 + Math.random() * 70,
            text,
            lines,
            halfWidth,
            halfHeight,
            hasCollided: false,
            age: 0,
            glow: 0
        });
    }
}

function updateRainDrops(dt) {
    for (const drop of drops) {
        drop.oldY = drop.y;
        drop.age += dt;
        drop.vy += 180 * dt;
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
        drop.glow = Math.max(0, drop.glow - dt * 2);
    }
}

function collideRainObstacles(drop, rects) {
    if (drop.hasCollided) return;
    // Удар о верхнюю грань: отскок и скольжение к краю.
    for (const rect of rects) {
        if (drop.vy > 0 && drop.x + drop.halfWidth > rect.left &&
            drop.x - drop.halfWidth < rect.right && drop.oldY + drop.halfHeight <= rect.top &&
            drop.y + drop.halfHeight >= rect.top) {
            drop.hasCollided = true;
            drop.y = rect.top - drop.halfHeight;
            drop.vy = -Math.max(45, drop.vy * 0.5);
            const direction = drop.x < rect.left + rect.width / 2 ? -1 : 1;
            drop.vx = direction * (45 + Math.random() * 55);
            drop.glow = 1;
            break;
        }
    }
}

function renderRainDrop(drop) {
    ctx.globalAlpha = Math.min(1, drop.age * 2) *
        Math.min(1, (18 - drop.age) / 2) * (0.25 + drop.glow * 0.4);
    const left = drop.x - drop.halfWidth;
    const top = drop.y - drop.halfHeight;
    for (let index = 0; index < drop.lines.length; index++) {
        ctx.fillText(drop.lines[index], left, top + (index + 0.5) * rainLineHeight);
    }
}

function drawRain(time) {
    const dt = Math.min((time - previousTime) / 1000 || 0, 0.033);
    previousTime = time;
    ctx.clearRect(0, 0, width, height);

    if (!motionPreference.matches) {
        ctx.font = rainFont;
        spawnRainDrops(dt);
        updateRainDrops(dt);

        // Каждое слово может столкнуться только один раз.
        for (let i = 0; i < drops.length; i++) {
            if (drops[i].hasCollided) continue;
            for (let j = i + 1; j < drops.length; j++) {
                collideWords(drops[i], drops[j]);
                if (drops[i].hasCollided) break;
            }
        }

        const rects = drops.some(drop => !drop.hasCollided)
            ? obstacles.map(element => element.getBoundingClientRect()) : [];
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue("--accent").trim() || "#80c7ff";

        for (const drop of drops) {
            collideRainObstacles(drop, rects);
            renderRainDrop(drop);
        }
        drops = drops.filter(drop => drop.y - drop.halfHeight < height + 30 &&
            drop.x + drop.halfWidth > -30 && drop.x - drop.halfWidth < width + 30 && drop.age < 18);
        ctx.globalAlpha = 1;
    }
    rainFrame = requestAnimationFrame(drawRain);
}

function restartRain() {
    cancelAnimationFrame(rainFrame);
    previousTime = 0;
    spawnTime = 0;
    drops = [];
    ctx.clearRect(0, 0, width, height);
    if (!document.hidden && !motionPreference.matches) {
        rainFrame = requestAnimationFrame(drawRain);
    }
}

// Эффекты наведения на профили.
function showCodeforcesExplosion(card, rect) {
    card.querySelector(".explosion-grid")?.remove();
    const grid = document.createElement("div");
    grid.className = "explosion-grid";
    grid.setAttribute("aria-hidden", "true");

    const cardRect = card.getBoundingClientRect();
    grid.style.left = `${rect.left - cardRect.left - card.clientLeft}px`;
    grid.style.width = `${rect.width}px`;
    card.appendChild(grid);

    const cells = Array.from({ length: 7 }, () => {
        const cell = document.createElement("div");
        cell.className = "explosion-cell";
        grid.appendChild(cell);
        return cell;
    });
    shuffle(cells);
    const count = 5 + Math.floor(Math.random() * 3);
    for (const cell of cells.slice(0, count)) {
        const explosion = document.createElement("img");
        explosion.className = "explosion";
        explosion.alt = "";
        explosion.src = "explosion.gif";
        const size = Math.min(cell.clientWidth, cell.clientHeight) * (0.75 + Math.random() * 0.25);
        explosion.style.width = `${size}px`;
        explosion.style.height = `${size}px`;
        explosion.style.left = `${Math.random() * (cell.clientWidth - size)}px`;
        explosion.style.bottom = "0";
        cell.appendChild(explosion);
    }
    setTimeout(() => grid.remove(), 1200);
}

function showProfileParticles(rect, isTelegram) {
    const count = 24;
    for (let i = 0; i < count; i++) {
        const particle = document.createElement(isTelegram ? "img" : "span");
        particle.className = "particle";
        if (isTelegram) {
            particle.classList.add("particle--telegram");
            particle.src = "telegram.svg";
            particle.alt = "";
        } else {
            particle.textContent = Math.random() < 0.5 ? "0" : "1";
        }
        particle.setAttribute("aria-hidden", "true");

        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        const edge = Math.min(
            rect.width / 2 / Math.abs(x),
            rect.height / 2 / Math.abs(y)
        );

        particle.style.left = `${rect.left + rect.width / 2 + x * edge}px`;
        particle.style.top = `${rect.top + rect.height / 2 + y * edge}px`;
        document.body.appendChild(particle);

        const distance = 35 + Math.random() * 85;
        const rotation = Math.random() * 120 - 60;
        const animation = particle.animate([
            { transform: "translate(-50%, -50%) scale(0.7)", opacity: 1 },
            {
                transform: `translate(calc(-50% + ${x * distance}px), calc(-50% + ${y * distance}px)) rotate(${rotation}deg) scale(0.2)`,
                opacity: 0
            }
        ], {
            duration: 600 + Math.random() * 400,
            easing: "ease-out"
        });

        animation.onfinish = () => particle.remove();
    }
}

function showProfileEffect(event) {
    if (motionPreference.matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const card = event.currentTarget.closest(".profile-card");
    if (card.dataset.service === "codeforces") {
        showCodeforcesExplosion(card, rect);
    } else {
        showProfileParticles(rect, card.dataset.service === "telegram");
    }
}

// Общая отмена: сначала останавливаем движения, затем восстанавливаем страницу.
function stopAllEffects() {
    setFunnyMode(false);
    if (document.body.classList.contains("falling-mode")) stopFalling();
    stopScreenExplosion();
    stopBlackHole();
    stopShuffle();
}

// Активный эффект забирает клик, чтобы он не нажал ссылку под ним.
function handlePageClick(event) {
    if (event.target.closest("#shuffle-cancel")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        stopAllEffects();
        return;
    }
    let stopEffect;
    if (document.body.classList.contains("funny-mode")) stopEffect = () => setFunnyMode(false);
    else if (document.body.classList.contains("falling-mode")) stopEffect = stopFalling;
    else if (document.body.classList.contains("explosion-mode")) stopEffect = stopScreenExplosion;
    else return;

    event.preventDefault();
    event.stopImmediatePropagation();
    stopEffect();
}

// Подключаем события после объявления всех переменных и функций.
resetTheme();
for (const input of themeInputs) {
    input.addEventListener("input", () => setThemeValue(input.dataset.variable, input.value));
}
themeControls.addEventListener("submit", event => event.preventDefault());
themeControls.addEventListener("reset", event => {
    event.preventDefault();
    resetTheme();
});

document.addEventListener("click", handlePageClick, true);

document.addEventListener("click", handleShuffleClick, true);

document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    stopAllEffects();
});

funnyButton.addEventListener("click", () => setFunnyMode(true));
fallingButton.addEventListener("click", startFalling);
explosionButton.addEventListener("click", startScreenExplosion);
shuffleButton.addEventListener("click", startShuffle);
blackHoleButton.addEventListener("click", startBlackHole);

window.addEventListener("resize", () => {
    if (document.body.classList.contains("falling-mode")) stopFalling();
    if (blackHoleActive) stopBlackHole();
    resizeRain();
});
document.addEventListener("visibilitychange", restartRain);
motionPreference.addEventListener("change", restartRain);
resizeRain();
restartRain();

for (const link of document.querySelectorAll(".funny-nav-link")) {
    link.addEventListener("click", highlightFunnyButtons);
}

for (const button of document.querySelectorAll(".profile-button")) {
    button.addEventListener("pointerenter", showProfileEffect);
}
