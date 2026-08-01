# Design System

## Direction

The editor is a practical production desk around a genuine overhead whiteboard preview. The film uses warm white dry-erase surfaces, black marker drawings, occasional red or blue emphasis, a visible drawing hand, faint erased ghosts, and simple handwritten captions.

## Color

- Ink: `oklch(24% 0.018 160)`
- Whiteboard: `oklch(97% 0.006 95)`
- Chrome: `oklch(91% 0.008 95)`
- Red marker: `oklch(62% 0.18 32)`
- Blue marker: `oklch(54% 0.13 250)`
- Success: `oklch(52% 0.11 160)`

## Typography

Use a compact native sans-serif for editor controls and Kalam only inside the film for authored handwriting. Captions prioritize readability.

## Components

Controls use conventional rectangular buttons, visible focus rings, restrained color, and explicit states. The selected scene uses a full outline/background treatment.

## Motion

Editor transitions take 150–220ms with ease-out. Film motion follows marker strokes, hand movement, erasing, and purposeful camera reframing. Regeneration changes composition, crop, stroke paths, and rhythm together.

## Layout

The preview always fits above the timeline. Playback controls remain clickable at every supported viewport size. The timeline scrolls horizontally without overlaying the preview.
