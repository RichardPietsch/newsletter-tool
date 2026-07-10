export default function CheckEmailPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-bold">Prüfe dein Postfach</h1>
      <p className="mt-3 text-slate-600">
        Wenn für diese E-Mail-Adresse ein Zugang besteht, haben wir einen Login-Link gesendet. Der Link ist nur kurz gültig und einmal nutzbar.
      </p>
      <a className="mt-6 inline-block text-blue-700" href="/login">Andere E-Mail verwenden</a>
    </main>
  );
}
