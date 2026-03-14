# Facebook Emoji Suggest

A Chrome extension that suggests stickers while typing in Facebook Messenger.

## Installation

### Development

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

### Testing

```bash
bun test
```

## Usage

1. Go to [facebook.com/messages](https://www.facebook.com/messages)
2. Start typing a message
3. Type a trigger word like "hi", "love", "lol", etc.
4. A popup will appear with sticker suggestions
5. Click a sticker to send it

## Supported Triggers

The extension supports 70+ trigger words including:
- Greetings: hi, hello, hey, yo
- Emotions: love, happy, sad, angry
- Reactions: lol, haha, wow, omg
- And many more...

## License

MIT
