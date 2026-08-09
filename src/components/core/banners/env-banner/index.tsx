export default function EnvBanner() {
  const env =
    process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'local';
console.log(env);

  if (env === 'production') {
    return null;
  }

  const backgroundColor = env === 'development' ? 'red' : 'purple';

  const text = env === 'development' ? 'DEV' : 'LOCAL';

  return (
    <div
      style={{
        position: 'fixed',
        top: 18,
        left: -50,
        width: 160,
        height: 28,
        backgroundColor,
        color: 'white',
        fontWeight: 700,
        fontSize: 12,

        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',

        lineHeight: '1', // ✅ clé du problème
        transform: 'rotate(-45deg)',
        zIndex: 9999,
        pointerEvents: 'none',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }}
    >
      <span
        style={{
          display: 'block',
          transform: 'translateY(-0.5px)', // 🎯 ajustement visuel parfait
        }}
      >
        {text}
      </span>
    </div>
  );
}
