"""Merged tables must preserve every cell and never align different pronouns."""
import unittest
from export_pdf import grouped,render_block

class LayoutTest(unittest.TestCase):
 def part(self,title,rows):return {'title':title,'headers':['Zamir','Ma’lum','Majhul'],'rows':rows,'note':''}
 def test_merge_keeps_column_order(self):
  a=self.part('Moziy',[['هُوَ','كَتَبَ','كُتِبَ'],['هِيَ','كَتَبَتْ','كُتِبَتْ']])
  b=self.part('Muzori’',[['هُوَ','يَكْتُبُ','يُكْتَبُ'],['هِيَ','تَكْتُبُ','تُكْتَبُ']])
  groups=grouped([a,b]);self.assertEqual(len(groups),1)
  markup=render_block(groups[0]);self.assertIn('dir="rtl"',markup)
  self.assertLess(markup.index('كَتَبَ'),markup.index('يَكْتُبُ'))
  for part in [a,b]:
   for row in part['rows']:
    for word in row[1:]:self.assertEqual(markup.count('>'+word+'<'),1)
 def test_different_persons_stay_separate(self):
  a=self.part('Moziy',[['هُوَ','a','b']]);b=self.part('Amr',[['أَنْتَ','c','d']])
  self.assertEqual(len(grouped([a,b])),2)
 def test_escape(self):
  self.assertNotIn('<script>',render_block([self.part('<script>',[['هُوَ','<script>','—']])]))
if __name__=='__main__':unittest.main()
