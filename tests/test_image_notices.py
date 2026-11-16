import io
import sys
import tarfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from image_notices import read_notices

class NoticeTests(unittest.TestCase):
    def archive(self, entries):
        data=io.BytesIO()
        with tarfile.open(fileobj=data,mode='w') as archive:
            for name, body in entries:
                item=tarfile.TarInfo(name)
                if isinstance(body,tuple):
                    item.type=tarfile.SYMTYPE;item.linkname=body[0]
                    archive.addfile(item)
                else:
                    item.size=len(body);archive.addfile(item,io.BytesIO(body))
        data.seek(0)
        return tarfile.open(fileobj=data)

    def test_only_shipped_license_directory_and_exact_text(self):
        with self.archive([('licenses/pkg/copyright',b'Terms\n'),('usr/lib/code.so',b'ignore')]) as archive:
            notices=read_notices(archive)
        self.assertEqual([n['path'] for n in notices],['/licenses/pkg/copyright'])
        self.assertEqual(notices[0]['text'],'Terms\n')
        self.assertEqual(len(notices[0]['sha256']),64)

    def test_shared_notice_link(self):
        with self.archive([('licenses/shared',b'Shared terms'),('licenses/pkg/copyright',('../shared',))]) as archive:
            notices=read_notices(archive)
        self.assertEqual(len(notices),2)
        self.assertEqual(notices[0]['text'],notices[1]['text'])

    def test_empty_is_not_a_failure(self):
        with self.archive([('usr/lib/code.so',b'ignore')]) as archive:
            self.assertEqual(read_notices(archive),[])

    def test_broken_link_is_not_silently_omitted(self):
        with self.archive([('licenses/missing',('absent',))]) as archive:
            with self.assertRaises((KeyError,ValueError)):
                read_notices(archive)
