import type { useTranslations } from 'next-intl';
import * as yup from 'yup';
import { tKeys } from '@/localization/tKeys';

type Translator = ReturnType<typeof useTranslations>;

export const loginSchema = (t: Translator) =>
  yup.object().shape({
    email: yup.string().email().required(),
    password: yup.string().required(t(tKeys.common.errors.required)),
  });
