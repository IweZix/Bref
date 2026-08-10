import { Link } from '@/localization/navigation';

export default async function LinkNotFoundPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;

  return (
    <main>
      <h1>Link not found</h1>
      <p>
        This short link doesn&apos;t exist, has been disabled, or has expired.
      </p>
      {slug && (
        <p>
          <Link href={`/report?slug=${encodeURIComponent(slug)}`}>
            Report this link
          </Link>
        </p>
      )}
    </main>
  );
}
