import { MarkdownView, Plugin } from 'obsidian';
import type { EditorView } from '@codemirror/view';
import { StateEffect } from '@codemirror/state';
import { createColorMarkPostProcessor } from '../parser/readingView';
import { createHighlightLivePreviewExtension, refreshDecorationsEffect } from '../parser/livePreview';
import { buildContextMenuHandler } from './contextMenu';
import { registerColorCommands, registerOpenPaletteCommand, registerUnhighlightCommand } from './commands';
import { migrateSettings, type Settings } from '../settings/data';
import { applyHighlightStyle, getColorMap, removeHighlightStyle, type HighlightColorVars } from '../settings/styleInjector';
import { HighlightSettingTab } from '../settings/tab';
import { detectLocale, setLocale } from '../i18n';

export default class NativeHighlightPlugin extends Plugin {
  settings!: Settings;
  registeredColorCommandIds: string[] = [];
  private colorMap: Map<string, HighlightColorVars> = new Map();

  async onload() {
    setLocale(detectLocale());
    await this.loadSettings();
    this.rebuildColorMap();
    applyHighlightStyle(this.settings.style);
    this.registerMarkdownPostProcessor(createColorMarkPostProcessor(() => this.colorMap));
    this.registerEditorExtension(createHighlightLivePreviewExtension(() => this.colorMap));
    this.registerEvent(this.app.workspace.on('editor-menu', buildContextMenuHandler(this)));
    this.addSettingTab(new HighlightSettingTab(this.app, this));
    registerOpenPaletteCommand(this);
    registerUnhighlightCommand(this);
    registerColorCommands(this);

    // The color map depends on the active theme (theme-dark class + computed
    // --color-* vars), which may not be applied yet during onload. Rebuild
    // once the layout is ready, and whenever the theme changes afterwards.
    if (!this.app.workspace.layoutReady) {
      this.app.workspace.onLayoutReady(() => {
        this.rebuildColorMap();
        this.refreshEditors();
      });
    }

    this.registerEvent(this.app.workspace.on('css-change', () => {
      this.rebuildColorMap();
      this.refreshEditors();
    }));
  }

  onunload() {
    removeHighlightStyle();
  }

  async loadSettings() {
    this.settings = migrateSettings((await this.loadData()) as Partial<Settings> | null);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.rebuildColorMap();
    applyHighlightStyle(this.settings.style);
    registerColorCommands(this);
    this.refreshEditors();
  }

  private rebuildColorMap(): void {
    this.colorMap = getColorMap(this.settings);
  }

  private refreshEditors(): void {
    // Enumerate every open leaf (all windows including popouts) and dispatch the
    // rebuild effect into each markdown editor's CM6 view. The effect is what the
    // livePreview ViewPlugin's update guard watches — an empty transaction alone
    // would not trip it. `iterateCodeMirrors` used to serve here but returned 0
    // markdown views on recent Obsidian, hence this leaf-based enumeration.
    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) return;
      const cm = (view.editor as unknown as { cm?: EditorView }).cm;
      cm?.dispatch({ effects: refreshDecorationsEffect.of(undefined) });
    });
  }
}

