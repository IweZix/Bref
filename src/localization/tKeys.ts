export const tKeys = {
  common: {
    errors: {
      required: 'common.errors.required',
      generic: 'common.errors.generic',
    },
  },
  navbar: {
    home: 'navbar.home',
  },
  homepage: {
    title: 'homepage.title',
  },
  account: {
    emailForm: {
      description: 'account.emailForm.description',
      emailPlaceholder: 'account.emailForm.emailPlaceholder',
      submit: 'account.emailForm.submit',
      checkEmailTitle: 'account.emailForm.checkEmailTitle',
      checkEmailBody: 'account.emailForm.checkEmailBody',
      checkEmailBodyCrossDevice: 'account.emailForm.checkEmailBodyCrossDevice',
      useDifferentEmail: 'account.emailForm.useDifferentEmail',
      alreadyConverted: 'account.emailForm.alreadyConverted',
      invalidLinkError: 'account.emailForm.invalidLinkError',
    },
    mergeConfirmation: {
      heading: 'account.mergeConfirmation.heading',
      body: 'account.mergeConfirmation.body',
      quotaNote: 'account.mergeConfirmation.quotaNote',
      confirm: 'account.mergeConfirmation.confirm',
      decline: 'account.mergeConfirmation.decline',
      resultReassigned: 'account.mergeConfirmation.resultReassigned',
      resultSkipped: 'account.mergeConfirmation.resultSkipped',
      noPendingMerge: 'account.mergeConfirmation.noPendingMerge',
      backToDashboard: 'account.mergeConfirmation.backToDashboard',
    },
  },
  shortener: {
    clicksTimelineChart: {
      emptyState: 'shortener.clicksTimelineChart.emptyState',
      ariaLabel: 'shortener.clicksTimelineChart.ariaLabel',
      seriesName: 'shortener.clicksTimelineChart.seriesName',
    },
    slugTypeBadge: {
      custom: 'shortener.slugTypeBadge.custom',
    },
    percentageBarList: {
      emptyState: 'shortener.percentageBarList.emptyState',
    },
    customSlugQuotaMeter: {
      label: 'shortener.customSlugQuotaMeter.label',
    },
    copyButton: {
      toastSuccess: 'shortener.copyButton.toastSuccess',
      toastError: 'shortener.copyButton.toastError',
      copied: 'shortener.copyButton.copied',
      copy: 'shortener.copyButton.copy',
    },
    deleteLinkButton: {
      trigger: 'shortener.deleteLinkButton.trigger',
      dialogTitle: 'shortener.deleteLinkButton.dialogTitle',
      dialogBodyCustomSlug: 'shortener.deleteLinkButton.dialogBodyCustomSlug',
      dialogBodyDefault: 'shortener.deleteLinkButton.dialogBodyDefault',
      cancel: 'shortener.deleteLinkButton.cancel',
      confirm: 'shortener.deleteLinkButton.confirm',
    },
    linkCreateForm: {
      formatErrors: {
        tooShort: 'shortener.linkCreateForm.formatErrors.tooShort',
        tooLong: 'shortener.linkCreateForm.formatErrors.tooLong',
        invalidCharacters:
          'shortener.linkCreateForm.formatErrors.invalidCharacters',
        edgeHyphen: 'shortener.linkCreateForm.formatErrors.edgeHyphen',
        consecutiveHyphens:
          'shortener.linkCreateForm.formatErrors.consecutiveHyphens',
        allDigits: 'shortener.linkCreateForm.formatErrors.allDigits',
      },
      availabilityErrors: {
        invalidFormat:
          'shortener.linkCreateForm.availabilityErrors.invalidFormat',
        reserved: 'shortener.linkCreateForm.availabilityErrors.reserved',
        tooSimilar: 'shortener.linkCreateForm.availabilityErrors.tooSimilar',
        retired: 'shortener.linkCreateForm.availabilityErrors.retired',
        brandMismatch:
          'shortener.linkCreateForm.availabilityErrors.brandMismatch',
        taken: 'shortener.linkCreateForm.availabilityErrors.taken',
        requiresAccount:
          'shortener.linkCreateForm.availabilityErrors.requiresAccount',
        quotaExceeded:
          'shortener.linkCreateForm.availabilityErrors.quotaExceeded',
      },
      resetButton: 'shortener.linkCreateForm.resetButton',
      slugFeedback: {
        available: 'shortener.linkCreateForm.slugFeedback.available',
        notAvailable: 'shortener.linkCreateForm.slugFeedback.notAvailable',
        suggestionsHint:
          'shortener.linkCreateForm.slugFeedback.suggestionsHint',
        checking: 'shortener.linkCreateForm.slugFeedback.checking',
      },
      urlLabel: 'shortener.linkCreateForm.urlLabel',
      urlPlaceholder: 'shortener.linkCreateForm.urlPlaceholder',
      submit: 'shortener.linkCreateForm.submit',
      customizeToggle: 'shortener.linkCreateForm.customizeToggle',
      slugPlaceholder: 'shortener.linkCreateForm.slugPlaceholder',
      interstitialCheckboxLabel:
        'shortener.linkCreateForm.interstitialCheckboxLabel',
      createAccountCta: 'shortener.linkCreateForm.createAccountCta',
    },
    exportLinksButton: {
      filename: 'shortener.exportLinksButton.filename',
      exportError: 'shortener.exportLinksButton.exportError',
      button: 'shortener.exportLinksButton.button',
    },
    statusBadge: {
      active: 'shortener.statusBadge.active',
      disabled: 'shortener.statusBadge.disabled',
      expired: 'shortener.statusBadge.expired',
    },
    linkDetailStats: {
      unknown: 'shortener.linkDetailStats.unknown',
      deviceLabel: {
        mobile: 'shortener.linkDetailStats.deviceLabel.mobile',
        desktop: 'shortener.linkDetailStats.deviceLabel.desktop',
        tablet: 'shortener.linkDetailStats.deviceLabel.tablet',
      },
      sourceLabel: {
        web: 'shortener.linkDetailStats.sourceLabel.web',
        qr: 'shortener.linkDetailStats.sourceLabel.qr',
      },
      directAccess: 'shortener.linkDetailStats.directAccess',
      humanClicks: 'shortener.linkDetailStats.humanClicks',
      botPreviews: 'shortener.linkDetailStats.botPreviews',
      timelineHeading: 'shortener.linkDetailStats.timelineHeading',
      countryTitle: 'shortener.linkDetailStats.countryTitle',
      referrerTitle: 'shortener.linkDetailStats.referrerTitle',
      deviceTitle: 'shortener.linkDetailStats.deviceTitle',
      sourceTitle: 'shortener.linkDetailStats.sourceTitle',
    },
    linkListItem: {
      clicksPerWeek: 'shortener.linkListItem.clicksPerWeek',
      previewsCount: 'shortener.linkListItem.previewsCount',
    },
    linkQrCode: {
      filename: 'shortener.linkQrCode.filename',
      ariaLabel: 'shortener.linkQrCode.ariaLabel',
      downloadSvg: 'shortener.linkQrCode.downloadSvg',
      pngScreen: 'shortener.linkQrCode.pngScreen',
      pngPrint: 'shortener.linkQrCode.pngPrint',
    },
    reportForm: {
      successMessage: 'shortener.reportForm.successMessage',
      reportedLinkLabel: 'shortener.reportForm.reportedLinkLabel',
      reasonPlaceholder: 'shortener.reportForm.reasonPlaceholder',
      submit: 'shortener.reportForm.submit',
    },
    browserWarningBanner: {
      body: 'shortener.browserWarningBanner.body',
      createAccountCta: 'shortener.browserWarningBanner.createAccountCta',
      closeAriaLabel: 'shortener.browserWarningBanner.closeAriaLabel',
    },
    charts: {
      dayOfWeek: {
        short: {
          sun: 'shortener.charts.dayOfWeek.short.sun',
          mon: 'shortener.charts.dayOfWeek.short.mon',
          tue: 'shortener.charts.dayOfWeek.short.tue',
          wed: 'shortener.charts.dayOfWeek.short.wed',
          thu: 'shortener.charts.dayOfWeek.short.thu',
          fri: 'shortener.charts.dayOfWeek.short.fri',
          sat: 'shortener.charts.dayOfWeek.short.sat',
        },
      },
    },
    dayOfWeekChart: {
      heading: 'shortener.dayOfWeekChart.heading',
    },
    botToggle: {
      humans: 'shortener.botToggle.humans',
      bots: 'shortener.botToggle.bots',
      all: 'shortener.botToggle.all',
    },
    linkList: {
      emptyStateTitle: 'shortener.linkList.emptyStateTitle',
      emptyStateDescription: 'shortener.linkList.emptyStateDescription',
      linkCount: 'shortener.linkList.linkCount',
      sortRecent: 'shortener.linkList.sortRecent',
      sortPopular: 'shortener.linkList.sortPopular',
    },
    pages: {
      home: {
        dashboardLink: 'shortener.pages.home.dashboardLink',
        footerTrustCopy: 'shortener.pages.home.footerTrustCopy',
      },
      dashboard: {
        heading: 'shortener.pages.dashboard.heading',
      },
      account: {
        heading: 'shortener.pages.account.heading',
      },
      accountMerge: {
        heading: 'shortener.pages.accountMerge.heading',
      },
      linkDetail: {
        backToDashboard: 'shortener.pages.linkDetail.backToDashboard',
        createdOn: 'shortener.pages.linkDetail.createdOn',
        noQrCode: 'shortener.pages.linkDetail.noQrCode',
      },
      interstitial: {
        heading: 'shortener.pages.interstitial.heading',
        body: 'shortener.pages.interstitial.body',
        continueButton: 'shortener.pages.interstitial.continueButton',
      },
      linkNotFound: {
        heading: 'shortener.pages.linkNotFound.heading',
        body: 'shortener.pages.linkNotFound.body',
      },
      report: {
        heading: 'shortener.pages.report.heading',
      },
      reportLinkAction: 'shortener.pages.reportLinkAction',
    },
  },
} as const;
