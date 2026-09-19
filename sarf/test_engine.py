"""Hand-written Arabic paradigms: independent expectations, not engine snapshots."""
import json,subprocess,sys,unittest
from pathlib import Path
from engine import generate,canonical

class MorphologyTests(unittest.TestCase):
    def test_representative_classes(self):
        # past, root, future vowel, triliteral, present, ana-past, imperative, passive past
        cases=[
          ('كَتَبَ','كتب','ضمة',True,'يَكْتُبُ','كَتَبْتُ','اُكْتُبْ','كُتِبَ'),
          ('ضَرَبَ','ضرب','كسرة',True,'يَضْرِبُ','ضَرَبْتُ','اِضْرِبْ','ضُرِبَ'),
          ('فَتَحَ','فتح','فتحة',True,'يَفْتَحُ','فَتَحْتُ','اِفْتَحْ','فُتِحَ'),
          ('سَمِعَ','سمع','فتحة',True,'يَسْمَعُ','سَمِعْتُ','اِسْمَعْ','سُمِعَ'),
          ('كَرُمَ','كرم','ضمة',True,'يَكْرُمُ','كَرُمْتُ','اُكْرُمْ','كُرِمَ'),
          ('حَسِبَ','حسب','كسرة',True,'يَحْسِبُ','حَسِبْتُ','اِحْسِبْ','حُسِبَ'),
          ('قَالَ','قول','ضمة',True,'يَقُولُ','قُلْتُ','قُلْ','قِيلَ'),
          ('قَالَ','قيل','كسرة',True,'يَقِيلُ','قِلْتُ','قِلْ','قِيلَ'),
          ('بَاعَ','بيع','كسرة',True,'يَبِيعُ','بِعْتُ','بِعْ','بِيعَ'),
          ('خَافَ','خوف','فتحة',True,'يَخَافُ','خِفْتُ','خَفْ','خِيفَ'),
          ('وَعَدَ','وعد','كسرة',True,'يَعِدُ','وَعَدْتُ','عِدْ','وُعِدَ'),
          ('رَمَى','رمي','كسرة',True,'يَرْمِي','رَمَيْتُ','اِرْمِ','رُمِيَ'),
          ('دَعَا','دعو','ضمة',True,'يَدْعُو','دَعَوْتُ','اُدْعُ','دُعِيَ'),
          ('سَعَى','سعي','فتحة',True,'يَسْعَى','سَعَيْتُ','اِسْعَ','سُعِيَ'),
          ('وَقَى','وقي','كسرة',True,'يَقِي','وَقَيْتُ','قِ','وُقِيَ'),
          ('طَوَى','طوي','كسرة',True,'يَطْوِي','طَوَيْتُ','اِطْوِ','طُوِيَ'),
          ('مَدَّ','مدد','ضمة',True,'يَمُدُّ','مَدَدْتُ','مُدَّ','مُدَّ'),
          ('أَخَذَ','ءخذ','ضمة',True,'يَأْخُذُ','أَخَذْتُ','خُذْ','أُخِذَ'),
          ('أَكَلَ','ءكل','ضمة',True,'يَأْكُلُ','أَكَلْتُ','كُلْ','أُكِلَ'),
          ('قَرَأَ','قرء','فتحة',True,'يَقْرَأُ','قَرَأْتُ','اِقْرَأْ','قُرِئَ'),
          ('عَلَّمَ','علم','فتحة',False,'يُعَلِّمُ','عَلَّمْتُ','عَلِّمْ','عُلِّمَ'),
          ('قَاتَلَ','قتل','فتحة',False,'يُقَاتِلُ','قَاتَلْتُ','قَاتِلْ','قُوتِلَ'),
          ('أَكْرَمَ','كرم','فتحة',False,'يُكْرِمُ','أَكْرَمْتُ','أَكْرِمْ','أُكْرِمَ'),
          ('أَقَامَ','قوم','فتحة',False,'يُقِيمُ','أَقَمْتُ','أَقِمْ','أُقِيمَ'),
          ('تَعَلَّمَ','علم','فتحة',False,'يَتَعَلَّمُ','تَعَلَّمْتُ','تَعَلَّمْ','تُعُلِّمَ'),
          ('تَقَاتَلَ','قتل','فتحة',False,'يَتَقَاتَلُ','تَقَاتَلْتُ','تَقَاتَلْ','تُقُوتِلَ'),
          ('اِنْكَسَرَ','كسر','فتحة',False,'يَنْكَسِرُ','اِنْكَسَرْتُ','اِنْكَسِرْ','اُنْكُسِرَ'),
          ('اِجْتَمَعَ','جمع','فتحة',False,'يَجْتَمِعُ','اِجْتَمَعْتُ','اِجْتَمِعْ','اُجْتُمِعَ'),
          ('اِسْتَخْرَجَ','خرج','فتحة',False,'يَسْتَخْرِجُ','اِسْتَخْرَجْتُ','اِسْتَخْرِجْ','اُسْتُخْرِجَ'),
          ('دَحْرَجَ','دحرج','فتحة',False,'يُدَحْرِجُ','دَحْرَجْتُ','دَحْرِجْ','دُحْرِجَ'),
        ]
        for past,root,future,tri,present,ana,amr,passive in cases:
            with self.subTest(past=past):
                t=generate(past,future,root,tri,True)['tables']
                for got,want in [(t['active'][1][0],present),(t['active'][0][12],ana),(t['command'][0][6],amr),(t['passive'][0][0],passive)]:self.assertIn(canonical(got),[canonical(want), 'اُمْدُدْ'] if past=='مَدَّ' and want=='مُدَّ' else [canonical(want)])
    def test_weak_moods_and_emphasis(self):
        t=generate('رَمَى','كسرة','رمي',True,True)['tables']
        self.assertEqual(t['active'][2][0],'يَرْمِيَ');self.assertEqual(t['active'][3][0],'يَرْمِ')
        self.assertEqual(t['active'][3][8],'تَرْمُوا');self.assertEqual(t['active'][3][11],'تَرْمِينَ')
        t=generate('كَتَبَ','ضمة','كتب',True,True)['tables']
        self.assertEqual(t['emphasis']['active'][0][6],'تَكْتُبَنَّ');self.assertEqual(t['emphasis']['active'][1][6],'تَكْتُبَنْ')
        for i in [1,4,5,7,10,11]:self.assertEqual(t['emphasis']['active'][1][i],'')
        self.assertEqual(t['command'][1][9],'لَا تَكْتُبِي')
    def test_nominals(self):
        for p,r,f,tri,s,o in [('قَالَ','قول','ضمة',True,'قَائِلٌ','مَقُولٌ'),('بَاعَ','بيع','كسرة',True,'بَائِعٌ','مَبِيعٌ'),('رَضِيَ','رضو','فتحة',True,'رَاضٍ','مَرْضِيٌّ'),('أَقَامَ','قوم','فتحة',False,'مُقِيمٌ','مُقَامٌ'),('تَعَلَّمَ','علم','فتحة',False,'مُتَعَلِّمٌ','مُتَعَلَّمٌ')]:
            n=generate(p,f,r,tri,True)['tables']['nominals'];self.assertEqual(canonical(n['subject']),canonical(s));self.assertEqual(canonical(n['object']),canonical(o))
    def test_rejections_and_transitivity(self):
        self.assertIsNone(generate('ذَهَبَ','فتحة','ذهب',True,False)['tables']['passive'])
        for p,tri in [('لَيْسَ',True),('نِعْمَ',True),('كَتَبَ;echo',True),('أَكْرَمَ',True)]:
            with self.assertRaises(ValueError):generate(p,'فتحة','كتب',tri,True)
        self.assertEqual(generate('نَعَّمَ','فتحة','نعم',False,True)['form'],'II')
    def test_reverse_lookup(self):
        catalog=json.loads((Path(__file__).parent/'generated/catalog.json').read_text())
        kataba=next(v['id'] for v in catalog if v['past']=='كَتَبَ' and v['present']=='يَكْتُبُ')
        for q,want in [('كَتَبْتُ',True),('يَكْتُبُ',True),('كَتِبْتُ',False)]:
            result=subprocess.run([sys.executable,str(Path(__file__).parent/'lookup.py')],input=json.dumps({'query':q}),text=True,capture_output=True,check=True)
            self.assertEqual(kataba in json.loads(result.stdout)['ids'],want)

if __name__=='__main__':unittest.main()
