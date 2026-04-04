import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto bg-neutral-900/50 p-8 rounded-3xl border border-white/5">
                <Link to="/" className="text-emerald-500 hover:text-emerald-400 mb-8 block font-bold uppercase tracking-widest text-sm">← Geri Dön</Link>
                
                <h1 className="text-4xl font-black uppercase tracking-tighter mb-6 text-emerald-500">🛡️ Hakkımızda: Tank Fight</h1>
                <p className="text-neutral-300 mb-8 text-lg leading-relaxed">
                    <strong>Tank Fight: War-Torn City Combat</strong>, modern web teknolojileriyle geliştirilmiş, tarayıcı üzerinden anında oynanabilen aksiyon dolu bir 2D "Top-Down" tank savaşı oyunudur. Oyuncuları kuşbakışı bir perspektifle savaşın ortasına bırakan bu proje, hem stratejik hamleler hem de hızlı refleksler gerektiren dinamik bir yapıya sahiptir.
                </p>
                
                <div className="space-y-8 text-neutral-300">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">🚀 Teknik Altyapı ve Yazılım Mimarisi</h2>
                        <p className="mb-4">Bu oyun, hazır bir oyun motoru (Unity, Unreal vb.) kullanılmadan, tamamen HTML5 Canvas ve JavaScript/TypeScript dilleriyle sıfırdan yazılmış özel bir motor (Engine.ts) üzerinde çalışmaktadır.</p>
                        <ul className="list-disc pl-6 space-y-2 text-neutral-400">
                            <li><strong className="text-neutral-200">Frontend:</strong> Kullanıcı arayüzü modern React.js ve Tailwind CSS ile tasarlanmış, askeri temalı (Dark Mode) bir yapıya sahiptir.</li>
                            <li><strong className="text-neutral-200">Backend & Veritabanı:</strong> Dünya çapındaki skorların anlık olarak kaydedilmesi ve rekabetin korunması için Google Firebase (Firestore) entegrasyonu kullanılmaktadır.</li>
                            <li><strong className="text-neutral-200">Fizik Motoru:</strong> Gerçek zamanlı çarpışma algılama (collision detection), mermi sekme mekanikleri ve parçacık efektleri (toz, duman, patlama) oyunun içine gömülü özel fizik kodlarıyla yönetilmektedir.</li>
                        </ul>
                    </section>
                    
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">🎮 Oynanış ve Temel Özellikler</h2>
                        <ul className="list-disc pl-6 space-y-2 text-neutral-400">
                            <li><strong className="text-neutral-200">Hassas Kontroller:</strong> W, A, S, D veya yön tuşları ile hareket ederken, fare ile nişan alıp ateş edebilir; kritik anlarda 'F' tuşu ile hava saldırısı (Airstrike) çağırabilirsiniz.</li>
                            <li><strong className="text-neutral-200">Çeşitli Tank Sınıfları:</strong> Stratejinize göre Light, Medium veya Heavy tank sınıflarından birini seçebilir; ayrıca oyunun derinliklerinde saklı olan yüksek istatistikli "özel/gizli" tankları keşfedebilirsiniz.</li>
                            <li><strong className="text-neutral-200">Gelişmiş Yapay Zeka:</strong> Düşman tankları, oyuncuyu takip eden ve taktiksel ateş açan bir AI sistemiyle donatılmıştır. Kolaydan "Özel" (Custom) moda kadar farklı zorluk seviyeleri mevcuttur.</li>
                            <li><strong className="text-neutral-200">Rekabetçi Liderlik Tablosu:</strong> Kazandığınız her puan, Canlı Liderlik Tablosu aracılığıyla dünya çapındaki diğer oyuncularla yarışmanızı sağlar.</li>
                        </ul>
                    </section>
                    
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">🛡️ Vizyonumuz</h2>
                        <p className="text-neutral-400 leading-relaxed">
                            Tank Fight, web tarayıcılarının sınırlarını zorlayarak oyunculara kurulum gerektirmeyen, yüksek performanslı ve eğlenceli bir oyun deneyimi sunmayı amaçlar. Sürekli güncellenen yapısı ve topluluk odaklı skor tablosuyla, klasik tank oyunlarını modern teknolojilerle buluşturuyoruz.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
