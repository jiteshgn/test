import * as React from 'react';
import styles from './Dropdown.module.scss';
import { Icon } from '../Icons/Icon';

export interface IDropdownProps {
  id: string;
  placeholder: string;
  options: string[];
  value: string;
  /** Typing narrows the list (autocomplete). */
  searchable?: boolean;
  /**
   * With `searchable`: the typed text is the filter itself (Course Name, matches part of a title).
   * Without it, typing only narrows the list and a value is set by picking an option.
   */
  freeText?: boolean;
  className?: string;
  onChange: (value: string) => void;
}

/**
 * Select box used by the filters. With `searchable` it is an autocomplete text box: typing narrows the list,
 * and the whole list is shown again once an option is picked. Picking the selected option again clears it.
 */
export const Dropdown = React.memo(function Dropdown({
  id,
  placeholder,
  options,
  value,
  searchable,
  freeText,
  className,
  onChange
}: IDropdownProps): React.ReactElement {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const [open, setOpen] = React.useState<boolean>(false);
  /** Text typed in the autocomplete box. */
  const [query, setQuery] = React.useState<string>(value);
  /** Highlighted option (keyboard / mouse hover), -1 for none. */
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  // When the value changes from outside (e.g. Reset), show it in the text box.
  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  // While the list is open, a click anywhere outside the dropdown closes it.
  React.useEffect(() => {
    if (!open) {
      return;
    }
    const onDocumentMouseDown = (event: MouseEvent): void => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [open]);

  // Keep the highlighted option visible when moving with the arrow keys.
  React.useEffect(() => {
    const list = listRef.current;
    if (!open || !list || activeIndex < 0) {
      return;
    }
    const item = list.children[activeIndex] as HTMLElement | undefined;
    if (item && item.scrollIntoView) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  // Options shown in the list: the ones containing the typed text.
  // When the box is empty or holds a picked option, show them all so another one can be chosen.
  const visibleOptions: string[] = React.useMemo(() => {
    const text: string = query.trim().toLowerCase();
    if (!searchable || !text || options.indexOf(query) !== -1) {
      return options;
    }
    return options.filter((o) => o.toLowerCase().indexOf(text) !== -1);
  }, [options, query, searchable]);

  const openList = (): void => {
    if (!open) {
      setOpen(true);
      setActiveIndex(options.indexOf(value));
    }
  };

  const closeList = (): void => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const toggleList = (): void => {
    if (open) {
      closeList();
    } else {
      openList();
    }
  };

  const select = (option: string): void => {
    const next: string = option === value ? '' : option;
    setQuery(next);
    closeList();
    onChange(next);
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const text: string = event.target.value;
    setQuery(text);
    setOpen(true);
    setActiveIndex(text ? 0 : -1);
    // Free text filters as you type; otherwise only clearing the box changes the value.
    if (freeText || !text) {
      onChange(text);
    }
  };

  /**
   * Leaving a pick-from-the-list box: text that names an option (any letter case) selects it,
   * anything else goes back to the selected option.
   */
  const commitTyped = (): void => {
    if (!searchable || freeText) {
      return;
    }
    const text: string = query.trim().toLowerCase();
    const match: string | undefined = text ? options.filter((o) => o.toLowerCase() === text)[0] : undefined;
    if (match) {
      setQuery(match);
      if (match !== value) {
        onChange(match);
      }
    } else {
      setQuery(value);
    }
  };

  const onInputBlur = (): void => {
    commitTyped();
    closeList();
  };

  // The × button empties the box and shows the whole list.
  const clear = (): void => {
    setQuery('');
    if (value) {
      onChange('');
    }
    setOpen(true);
    setActiveIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const onClearMouseDown = (event: React.MouseEvent<HTMLButtonElement>): void => {
    // Keep the focus in the text box and do not toggle the list.
    event.preventDefault();
    event.stopPropagation();
  };

  // Clicking the caret area of the autocomplete focuses the text box.
  const onFieldMouseDown = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (searchable && event.target !== inputRef.current) {
      event.preventDefault();
      if (inputRef.current) {
        inputRef.current.focus();
      }
      toggleList();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) {
          openList();
        } else {
          setActiveIndex(Math.min(visibleOptions.length - 1, activeIndex + 1));
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (open) {
          setActiveIndex(Math.max(0, activeIndex - 1));
        }
        break;
      case 'Enter':
        if (open && activeIndex >= 0 && activeIndex < visibleOptions.length) {
          event.preventDefault();
          select(visibleOptions[activeIndex]);
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          if (searchable && !freeText) {
            setQuery(value);
          }
          closeList();
        }
        break;
      case 'Tab':
        closeList();
        break;
      default:
        break;
    }
  };

  const listId: string = `${id}-listbox`;
  const activeId: string | undefined = open && activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined;

  return (
    <div ref={rootRef} className={[styles.dropdown, open ? styles.isOpen : '', className || ''].join(' ')}>
      <div className={styles.field} onMouseDown={onFieldMouseDown}>
        {searchable ? (
          <input
            ref={inputRef}
            id={id}
            className={styles.input}
            type="text"
            value={query}
            placeholder={placeholder}
            aria-label={placeholder}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeId}
            autoComplete="off"
            onChange={onInputChange}
            onFocus={openList}
            onBlur={onInputBlur}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button
            id={id}
            type="button"
            className={styles.trigger}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-label={value ? `${placeholder}: ${value}` : placeholder}
            onClick={toggleList}
            onKeyDown={onKeyDown}
          >
            <span className={value ? styles.value : styles.placeholder}>{value || placeholder}</span>
          </button>
        )}
        {searchable && query ? (
          <button
            type="button"
            className={styles.clearButton}
            aria-label={`Clear ${placeholder}`}
            tabIndex={-1}
            onMouseDown={onClearMouseDown}
            onClick={clear}
          >
            <Icon name="close" size={18} />
          </button>
        ) : (
          <Icon name="caretDown" size={22} className={styles.caret} />
        )}
      </div>

      {open && (
        <ul ref={listRef} id={listId} className={styles.panel} role="listbox" aria-label={placeholder}>
          {visibleOptions.length === 0 && <li className={styles.empty}>No matches</li>}
          {visibleOptions.map((option, index) => (
            <li
              key={option}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={option === value}
              className={[
                styles.option,
                option === value ? styles.selected : '',
                index === activeIndex ? styles.active : ''
              ].join(' ')}
              // Keep focus in the text box while clicking an option.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
