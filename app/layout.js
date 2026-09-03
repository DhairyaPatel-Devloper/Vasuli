import './globals.css';

export const metadata = {
  title: 'Payment Recovery Engine | AI Revenue Recovery',
  description: 'Autonomous AI-driven payment recovery and revenue leak engine for Razorpay AI Buildathon.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="bg-[#f9f9f9] text-[#1a1c1c] antialiased">
        {children}
      </body>
    </html>
  );
}
