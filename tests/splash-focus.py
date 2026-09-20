"""Check background splash rendering without requiring a display server."""
import sys
import types
import unittest
from pathlib import Path

class FakeWindow:
    def __init__(self, **kwargs):
        self.frames = []
    def set_mouse_visible(self, value):
        pass
    def draw(self, dt):
        self.frames.append(dt)

sys.modules['pyglet'] = types.SimpleNamespace(window=types.SimpleNamespace(Window=FakeWindow))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'defaults/python'))
from lib.splashscreen.canvas import Canvas

class SplashFocusTest(unittest.TestCase):
    def test_first_frame_background_and_return(self):
        window = Canvas(pause_when_unfocused=True)
        window.draw(1 / 60)
        self.assertEqual(len(window.frames), 1, 'First draw must show the splash')
        window.on_deactivate()
        for _ in range(120):
            window.draw(1 / 60)
        self.assertEqual(len(window.frames), 1, 'Background window must not swap buffers')
        window.on_activate()
        window.draw(1 / 60)
        self.assertEqual(len(window.frames), 2, 'Splash must render again when focused')

    def test_disabled_preserves_background_draws(self):
        window = Canvas()
        window.on_deactivate()
        window.draw(1 / 60)
        self.assertEqual(len(window.frames), 1)
        window.on_activate()
        window.draw(1 / 60)
        self.assertEqual(len(window.frames), 2)

if __name__ == '__main__':
    unittest.main()
