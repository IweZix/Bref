import { getTranslations } from 'next-intl/server';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

export default async function LinkNotFoundPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const t = await getTranslations();
  const { slug } = await searchParams;

  return (
    <main>
      <h1>{t(tKeys.shortener.pages.linkNotFound.heading)}</h1>
      <p>{t(tKeys.shortener.pages.linkNotFound.body)}</p>
      {slug && (
        <p>
          <Link href={`/report?slug=${encodeURIComponent(slug)}`}>
            {t(tKeys.shortener.pages.reportLinkAction)}
          </Link>
        </p>
      )}
    </main>
  );
}
