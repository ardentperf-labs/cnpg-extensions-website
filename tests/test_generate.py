import sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from generate import packages, check_digest, readme_html, scan

class MetadataTests(unittest.TestCase):
    def test_license_expressions_and_unknowns_are_not_lost(self):
        result=packages({'packages':[{'name':'library','versionInfo':'2','licenseDeclared':'MIT OR Apache-2.0','licenseConcluded':'LicenseRef-custom','licenseInfoFromFiles':['BSD-3-Clause']},{'name':'unknown'}]})
        self.assertEqual(result[0]['declared'],'MIT OR Apache-2.0')
        self.assertEqual(result[0]['concluded'],'LicenseRef-custom')
        self.assertEqual(result[0]['files'],['BSD-3-Clause'])
        self.assertEqual(result[1]['declared'],'NOASSERTION')
    def test_mismatched_registry_content_is_rejected(self):
        with self.assertRaises(ValueError):check_digest(b'changed','sha256:'+'0'*64)
    def test_readme_links_follow_source_location(self):
        html=readme_html('[Sibling](../../pgextwlist/README.md) ![image](logo.png)\n\n<script>alert(1)</script>', 'org/repo','abc','pgrx/example/README.md',{('org/repo','pgextwlist/README.md'):'extensions/pgextwlist'})
        self.assertIn('../../extensions/pgextwlist/',html)
        self.assertIn('raw.githubusercontent.com/org/repo/abc/pgrx/example/logo.png',html)
        self.assertNotIn('<script>',html)
    def test_unavailable_database_is_not_clean_scan(self):
        result=scan(Path('unused'),'grype',{'error':'DB unavailable'})
        self.assertEqual(result['status'],'unavailable')
        self.assertNotIn('findings',result)

if __name__=='__main__': unittest.main()
