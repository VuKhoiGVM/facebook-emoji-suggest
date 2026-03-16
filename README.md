# Facebook Emoji Suggest

A Chrome Extension (Manifest V3) that suggests emojis and kaomoji while typing in Facebook Messenger.

## Features

- **Smart Suggestions**: Automatically suggests emojis/kaomoji when you type trigger words
- **First Word Only**: Suggestions appear only when typing the first word (won't interrupt your message)
- **Dark Mode**: Automatically adapts to Facebook's dark mode
- **Privacy Focused**: All processing happens locally in your browser

## Installation

### Prerequisites

- [Bun](https://bun.sh) - JavaScript runtime and package manager

### Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Build the extension:
   ```bash
   bun run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

## Usage

1. Go to [facebook.com/messages](https://www.facebook.com/messages)
2. Open any conversation
3. Type a trigger word (e.g., "hi", "love", "lol")
4. Click an emoji to replace the trigger word

### How It Works

- **First word detection**: Popup only shows when typing the first word of a message
- **Automatic hide**: Popup disappears when you type a second word
- **Clean restart**: Works again when you start a new message

## Supported Triggers

The extension supports 70+ trigger words including:

| Category | Examples |
|----------|----------|
| Greetings | hi, hello, hey, yo, bye |
| Emotions | love, happy, sad, angry, miss |
| Reactions | lol, haha, wow, omg, lolz |
| Actions | thanks, sorry, ok, yes, no |
| Kaomoji | Shrug (`¯\_(ツ)_/¯`), Tableflip (`(╯°□°)╯︵ ┻━┻`) |

## Tech Stack

- TypeScript
- Chrome Extension Manifest V3
- Shadow DOM for style isolation

## License

MIT
