from pathlib import Path
import base64,json,re
p=Path(__file__).resolve().parents[1]
html=(p/'index.html').read_text().replace('<link rel="stylesheet" href="style.css?v=sequential-countdown-v1">','<style>'+(p/'style.css').read_text()+'</style>').replace('<script src="character.js?v=sequential-countdown-v1"></script>','<script>'+(p/'character.js').read_text()+'</script>')
html=re.sub(r'<script data-local-entry>.*?</script>', '', html)
assets={f.stem:'data:image/'+('jpeg' if f.suffix=='.jpg' else 'png')+';base64,'+base64.b64encode(f.read_bytes()).decode() for f in (p/'assets').iterdir() if f.suffix in ('.png','.jpg')}
js='const embeddedAssets='+json.dumps(assets)+';\n'+(p/'app.js').read_text().replace("im.src='assets/'+name+(name.startsWith('portrait_')?'.jpg':'.png');","im.src=embeddedAssets[name];")
(p.parent/'sprite-playground.html').write_text(html.replace('<script src="app.js?v=sequential-countdown-v1"></script>','<script>'+js+'</script>'))
