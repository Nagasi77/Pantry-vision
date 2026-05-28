import os
from dotenv import load_dotenv

load_dotenv(".env.local")

def get_freshness_alert_template(item_name: str, days_left: int) -> str:
    app_url = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
    return f"""
    <html>
        <body>
            <h2>🚨 Pantry Alert: {item_name}</h2>
            <p>Halo,</p>
            <p>Produk <b>{item_name}</b> di pantry Anda sudah masuk zona merah.</p>
            <p>Tersisa sekitar <b>{days_left} hari</b> sebelum produk ini dianggap tidak segar lagi.</p>
            <p>Segera olah item tersebut atau gunakan untuk resep masakan Anda!</p>
            <br>
            <a href="{app_url}/dashboard">Cek Dashboard Pantry</a>
        </body>
    </html>
    """
