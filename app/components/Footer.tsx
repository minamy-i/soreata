// 問い合わせ先（Googleフォーム）。全ページ共通のフッターに表示する
const CONTACT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSf82WPX8qdj1_-ixbsm7ie6G1pgZBdUPmXTubKpvK40mHYZ4g/viewform?usp=dialog';

export default function Footer() {
  return (
    <footer className="app-footer">
      <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer" className="app-footer-link">
        お問い合わせ
      </a>
    </footer>
  );
}
