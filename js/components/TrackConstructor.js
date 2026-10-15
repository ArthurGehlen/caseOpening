export class TrackConstructor {
    constructor({ container, createCard, drawItem, totalCards = 55, winnerIndex = 45, spinTime = "6s" }) {
        this.container = container;
        this.createCard = createCard;
        this.drawItem = drawItem;
        this.totalCards = totalCards;
        this.winnerIndex = winnerIndex;
        this.spinTime = spinTime;
        this.spinning = false;

        this.viewport = document.createElement("section");
        this.track = document.createElement("section");
        this.marker = document.createElement("div");

        this.viewport.classList.add("viewport");
        this.marker.classList.add("marker");
        this.track.classList.add("track");
    }

    build_track() {
        this.container.appendChild(this.viewport);
        this.viewport.append(this.marker, this.track);
        this.generate_cards();
    }

    generate_cards(winner = null) {
        this.track.innerHTML = "";
        for (let i = 0; i < this.totalCards; i++) {
            const item = winner && i === this.winnerIndex ? winner : this.drawItem();
            this.track.appendChild(this.createCard(item));
        }
    }

    spin(winner = this.drawItem()) {
        return new Promise((resolve) => {
            if (this.spinning) return resolve(null);
            this.spinning = true;

            this.track.style.transition = "none";
            this.track.style.transform = "translateX(0)";
            this.generate_cards(winner);

            const winnerEl = this.track.children[this.winnerIndex];
            this.track.offsetWidth; // força reflow

            const winnerCenter = winnerEl.offsetLeft + winnerEl.offsetWidth / 2;
            const viewportCenter = this.viewport.offsetWidth / 2;
            const jitter = (Math.random() - 0.5) * winnerEl.offsetWidth * 0.8;
            const distance = winnerCenter - viewportCenter + jitter;

            this.track.style.transition = `transform ${this.spinTime} cubic-bezier(0.15, 0, 0.10, 1)`;
            this.track.style.transform = `translateX(${-distance}px)`;

            this.track.addEventListener("transitionend", (e) => {
                if (e.propertyName !== "transform") return;
                this.spinning = false;
                resolve(winner);
            }, { once: true });
        });
    }
}