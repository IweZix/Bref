import type { useTranslations } from 'next-intl';
import * as yup from 'yup';
import { tKeys } from '@/localization/tKeys';

type Translator = ReturnType<typeof useTranslations>;

export const linkSchema = (t: Translator) =>
  yup.object().shape({
    targetUrl: yup.string().required(t(tKeys.common.errors.required)).max(2048),
    slug: yup
      .string()
      .optional()
      .matches(/^[a-zA-Z0-9-]{3,32}$/, {
        excludeEmptyString: true,
        message: 'Slug must be 3-32 characters (letters, digits, hyphens)',
      }),
    title: yup.string().optional().max(200),
  });
