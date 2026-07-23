// Pure helper for the vision board's right-click canvas menu (CanvasMenu).
//
// The menu offers three actions on empty canvas: Add text, Generate image with AI, and
// Upload image. Each must close the menu the instant it is chosen (so the menu never sits
// over the card it just created) and then run its action. Because the action's board
// position is captured in the parent's callback closure, closing the menu first never loses
// where the click landed. Outside click, second right-click, and Escape close the menu
// through onClose without running any action; those paths do not go through here.

// Wrap a menu button: close the menu first, then run the chosen action. Returns a click
// handler for the button. Synchronous and order-guaranteed: onClose runs before action.
export function closeThenAct(onClose: () => void, action: () => void): () => void {
  return () => {
    onClose();
    action();
  };
}
