# Shared Components

This directory contains reusable UI components built with Tailwind CSS and standard HTML primitives.

## Available Components

- **Button**: Use for primary, secondary, destructive actions. Accepts `isLoading` state.
- **Badge**: Use for severity (high/medium/low) and status (covered/partial/gap/stale).
- **Input**: Use for forms. Supports `label`, `error`, and `helperText`.
- **Card**: Use for layout boundaries. Includes Header, Title, Description, Content, Footer subcomponents.
- **Modal**: Overlay for forms or alerts. Requires `isOpen` and `onClose`.
- **Spinner**: Indeterminate loading state. Use `size` prop to scale.
- **ProgressBar**: Determinate loading state (0-100).
- **Table**: Complex data grids. Uses standard HTML subcomponents (TableHead, TableRow, TableCell).
- **Tabs**: View switcher. Use `TabsContext` explicitly via components.
- **Alert**: Feedback banners with `variant` types.
- **Sidebar**: Role-aware navigation layout. Used exclusively in `ProtectedRoute`.

## Customizing
Modify `src/index.css` to update base colors or `tailwind.config.js` to extend theme tokens.

> Please do not modify component APIs directly; wrap them instead or add optional props if necessary to ensure backward compatibility for other team members.
