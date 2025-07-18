import { LitElement, html, css } from '../assets/lit-core-2.7.4.min.js';

export class PdfQuestionsView extends LitElement {
    static styles = css`
        :host {
            display: block;
            padding: 20px;
            color: white;
            overflow-y: auto;
            height: 100%;
            font-family: sans-serif;
        }
    `;

    static properties = {
        currentResponse: { type: String },
        isStreaming: { type: Boolean },
        isLoading: { type: Boolean }
    };

    constructor() {
        super();
        this.currentResponse = '';
        this.isStreaming = false;
        this.isLoading = true;
    }

    firstUpdated() {
        if (window.api?.pdfQuestionsView?.onQuestions) {
            window.api.pdfQuestionsView.onQuestions((_, questions) => {
                this.currentResponse = questions.map((q, i) => `**Q${i + 1}.** ${q}`).join('\n\n');
                this.isLoading = false;
                this.renderContent();
            });
        }
    }

   connectedCallback() {
  super.connectedCallback();

  if (window.api?.pdfView) {
    window.api.pdfView.onQuestions((_, questions) => {
      this.questions = questions;
      this.requestUpdate();
    });
  }
}



    renderContent() {
        const container = this.shadowRoot.getElementById('response');
        if (!container) return;

        const renderer = default_renderer(container);
        const p = parser(renderer);
        parser_write(p, this.currentResponse);
        parser_end(p);
    }

    render() {
        return html`
            ${this.isLoading
                ? html`<div>Loading questions...</div>`
                : html`<div id="response"></div>`
            }
        `;
    }
}

customElements.define('pdf-questions-view', PdfQuestionsView);
