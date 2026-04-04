import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto bg-neutral-900/50 p-8 rounded-3xl border border-white/5">
                <Link to="/" className="text-emerald-500 hover:text-emerald-400 mb-8 block font-bold uppercase tracking-widest text-sm">← Geri Dön</Link>
                <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">Gizlilik Politikası (Privacy Policy)</h1>
                <p className="text-neutral-500 mb-4">Son Güncelleme: 4 Nisan 2026</p>
                
                <div className="space-y-6 text-neutral-300">
                    <p>Bu Gizlilik Politikası, sitemizi ziyaret eden kullanıcıların bilgilerinin nasıl toplandığını, kullanıldığını ve korunduğunu açıklayacaktır. Sitemizi kullanarak bu politikayı kabul etmiş sayılırsınız.</p>
                    
                    <h2 className="text-2xl font-bold text-white">1. Bilgi Toplama ve Kullanımı</h2>
                    <p>Sitemiz, kullanıcı deneyimini iyileştirmek, içerik sunmak ve reklam yayınlamak amacıyla belirli bilgiler toplayabilir. Bu bilgiler arasında IP adresiniz, tarayıcı türünüz ve sitemizde geçirdiğiniz süre gibi anonim veriler yer alabilir.</p>
                    
                    <h2 className="text-2xl font-bold text-white">2. Çerezler (Cookies) ve Reklamlar</h2>
                    <p>Sitemiz, ziyaretçilere daha iyi bir hizmet sunmak ve ilgi alanlarına göre reklam göstermek için çerezleri kullanır.</p>
                    <p><strong>Google AdSense:</strong> Google, üçüncü taraf bir satıcı olarak sitemizde reklam yayınlamak için çerezlerden yararlanır.</p>
                    <p><strong>DART Çerezleri:</strong> Google'ın DART Çerezlerini kullanması, sitemize ve internetteki diğer sitelere yapılan ziyaretlere dayalı olarak kullanıcılarımıza reklam sunmasına olanak tanır.</p>
                    <p><strong>Kontrol Sizde:</strong> Kullanıcılar, Google Reklam Ayarları sayfasını ziyaret ederek kişiselleştirilmiş reklamcılığı devre dışı bırakabilirler.</p>
                    
                    <h2 className="text-2xl font-bold text-white">3. Üçüncü Taraf Bağlantıları</h2>
                    <p>Sitemiz, diğer web sitelerine bağlantılar içerebilir. Bu dış sitelerin gizlilik uygulamalarından sorumlu değiliz. Ziyaret ettiğiniz her sitenin gizlilik politikasını okumanızı öneririz.</p>
                    
                    <h2 className="text-2xl font-bold text-white">4. Veri Güvenliği</h2>
                    <p>Kullanıcı verilerinin güvenliği bizim için önemlidir. Ancak, internet üzerinden iletilen veya elektronik ortamda saklanan hiçbir yöntemin %100 güvenli olmadığını hatırlatmak isteriz.</p>
                    
                    <h2 className="text-2xl font-bold text-white">5. İletişim</h2>
                    <p>Bu gizlilik politikası ile ilgili herhangi bir sorunuz varsa, sitemiz üzerinden bizimle iletişime geçebilirsiniz.</p>
                </div>
            </div>
        </div>
    );
}
