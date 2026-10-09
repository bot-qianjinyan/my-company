import io
import unittest

from PIL import Image

from app.core.storage import AVATAR_PX, render_avatar_bytes


class AvatarStorageTests(unittest.TestCase):
    def test_wide_photo_is_saved_as_avatar_square(self) -> None:
        source = Image.new("RGB", (1200, 400), (20, 80, 200))
        buffer = io.BytesIO()
        source.save(buffer, format="PNG")
        original = buffer.getvalue()

        rendered = render_avatar_bytes(original)
        result = Image.open(io.BytesIO(rendered))

        self.assertEqual(result.size, (AVATAR_PX, AVATAR_PX))
        self.assertEqual(result.format, "JPEG")
        self.assertLess(len(rendered), len(original))

    def test_already_square_crop_keeps_the_chosen_region(self) -> None:
        source = Image.new("RGB", (AVATAR_PX, AVATAR_PX), (255, 0, 0))
        for x in range(48):
            for y in range(48):
                source.putpixel((x, y), (0, 255, 0))
        buffer = io.BytesIO()
        source.save(buffer, format="PNG")

        rendered = render_avatar_bytes(buffer.getvalue())
        result = Image.open(io.BytesIO(rendered))

        self.assertEqual(result.size, (AVATAR_PX, AVATAR_PX))
        red, green, blue = result.getpixel((16, 16))
        self.assertGreater(green, 200)
        self.assertLess(red, 40)
        self.assertLess(blue, 40)
