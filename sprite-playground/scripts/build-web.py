"""Build Cloudflare static assets and a dashboard-upload ZIP, without changing gameplay."""
from pathlib import Path
import hashlib, json, re, shutil, tempfile, zipfile

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/"sprite-playground"
OUTPUT=ROOT/"dist/arss-battle"
ARCHIVE=ROOT/"arss-battle-cloudflare.zip"

def main():
    OUTPUT.parent.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="arss-web-",dir=OUTPUT.parent) as temporary:
        stage=Path(temporary)
        html=(SOURCE/"index.html").read_text()
        html=re.sub(r"<script data-local-entry>.*?</script>","",html)
        (stage/"index.html").write_text(html)
        for name in ("app.js","character.js","style.css"):
            shutil.copyfile(SOURCE/name,stage/name)
        (stage/"assets").mkdir()
        for asset in sorted((SOURCE/"assets").glob("*.png")):
            shutil.copyfile(asset,stage/"assets"/asset.name)
        files=sorted(p for p in stage.rglob("*") if p.is_file())
        assert len(files)<1000
        assert all(p.stat().st_size<25*1024*1024 for p in files)
        for name in re.findall(r'(?:src|href)="([^"?#]+)',html):
            assert (stage/name).is_file(), name
        manifest={str(p.relative_to(stage)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
        # Replace only this script's generated publication directory.
        if OUTPUT.exists():shutil.rmtree(OUTPUT)
        shutil.copytree(stage,OUTPUT)
        with zipfile.ZipFile(ARCHIVE,"w",compression=zipfile.ZIP_DEFLATED) as archive:
            for p in files:archive.write(p,str(p.relative_to(stage)))
        (OUTPUT.parent/"arss-battle-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
        print(json.dumps({"files":len(files),"bytes":sum(p.stat().st_size for p in files),"archive":str(ARCHIVE),"archive_bytes":ARCHIVE.stat().st_size},indent=2))

if __name__=="__main__":main()
