interface EditorProps {
  filename?: string;
  initialContent?: string;
  language?: unknown;
  onLanguageChanged?: (language: unknown) => void;
  fetchContent?: (getter: (() => Promise<string>) | null) => void;
  onContentSaved?: () => void;
  className?: string;
}

const Editor = (_props: EditorProps) => {
  return <div>Editor placeholder - integrate code editor here</div>;
};

export default Editor;
