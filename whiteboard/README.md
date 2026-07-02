# Boxes and Banners Board

A very simple beginner whiteboard.

## Only two creation options

1. **Create Boxes**
   - Type values such as `2,3,4,55,6`.
   - Click **Create Boxes**.
   - Each value becomes one movable box with the value inside it.

2. **Create Banners**
   - Type headings such as `Start, Compare, Swap, Finish`.
   - Click **Create Banners**.
   - Each heading becomes one wide movable banner.

## Moving items

- Drag empty space around many items to select them.
- Drag any selected item to move all selected items together.
- Press **Delete** to remove selected items.

## Saving

Use **Save PNG** to download the board as an image.

## Files

- `index.html` — simple interface
- `app.js` — board logic, box creation, banner creation, selection, movement
- `renderer.js` — canvas drawing
- `state.js`, `commands.js`, `factories.js`, `selection.js` — whiteboard engine helpers
- `style.css` — visual design


## Fullscreen

Click **Fullscreen** to use the whole screen while teaching or presenting. Click **Exit Fullscreen** or press `Esc` to return.
