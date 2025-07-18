import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class QuestionsView extends LitElement {
  static properties = {
    questions: { type: String },
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      width: 100vw;
      height: 100vh;
      background: #f7f7fa;
      color: #222;
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }
    .container {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      max-width: 600px;
      margin: 48px auto;
      padding: 32px 32px 24px 32px;
      display: flex;
      flex-direction: column;
      min-height: 300px;
    }
    h1 {
      font-size: 1.6em;
      margin: 0 0 18px 0;
      text-align: center;
    }
    pre {
      background: #f3f3f7;
      border-radius: 8px;
      padding: 18px;
      font-size: 1em;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0 0 18px 0;
    }
    .close-btn {
      align-self: flex-end;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 1em;
      padding: 8px 18px;
      cursor: pointer;
      margin-top: 12px;
      transition: background 0.15s;
    }
    .close-btn:hover {
      background: #1d4ed8;
    }
  `;

  constructor() {
    super();
    this.questions = 'Loading...';
  }

  connectedCallback() {
    super.connectedCallback();
    if (window.questions && window.questions.onQuestions) {
      window.questions.onQuestions((q) => {
        this.questions = q;
      });
    }
  }

  _closeWindow() {
    window.close();
  }

  render() {
    console.log('[QuestionsView] Rendered with questions:', this.questions);
    return html`
      <div class="container">
        <h1>Interview Questions</h1>
        <pre>${this.questions}</pre>
        <button class="close-btn" @click=${this._closeWindow}>Close</button>
      </div>
    `;
  }
}

customElements.define('questions-view', QuestionsView); 