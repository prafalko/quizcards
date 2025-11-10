import { useState, useRef, useEffect } from "react";
import { Input } from "./ui/input";

interface EditableTitleProps {
  initialTitle: string;
  onChange: (newTitle: string) => void;
}

export function EditableTitle({ initialTitle, onChange }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local state when initialTitle changes
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle === "") {
      // Show error - title cannot be empty
      alert("Tytuł quizu nie może być pusty");
      setTitle(initialTitle);
      setIsEditing(false);
      return;
    }
    if (trimmedTitle !== initialTitle) {
      onChange(trimmedTitle);
    }
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setTitle(initialTitle);
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={title}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleInputKeyDown}
        className="text-2xl font-bold tracking-tight h-auto p-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Wprowadź tytuł quizu..."
      />
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      className="text-2xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded text-left bg-transparent border-none p-0"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title="Kliknij, aby edytować tytuł"
    >
      {title || "Bez tytułu"}
    </button>
  );
}
