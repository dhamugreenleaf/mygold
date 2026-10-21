import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCheck, FiShield, FiStar, FiArrowRight, FiRepeat } from 'react-icons/fi';
import {
  createMonthlySubscription,
  verifyMonthlySubscription,
  getSubscriptionPricing,
  getEntitlementStatus,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Upgrade = () => {
  const navigate = useNavigate();
  const { user, refreshUserProfile } = useAuth();
  const { t, isTamil } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const [planPrice, setPlanPrice] = useState(10);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [entitlement, setEntitlement] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingPrice(true);
        const [pricingRes, statusRes] = await Promise.allSettled([
          getSubscriptionPricing(),
          getEntitlementStatus(),
        ]);

        if (pricingRes.status === 'fulfilled' && pricingRes.value?.data?.price) {
          setPlanPrice(pricingRes.value.data.price);
        }
        if (statusRes.status === 'fulfilled' && statusRes.value?.data) {
          setEntitlement(statusRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load plan pricing or status:', err);
      } finally {
        setLoadingPrice(false);
      }
    };

    fetchData();

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setIsRazorpayLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleStartMonthlySubscription = async () => {
    if (!isRazorpayLoaded) {
      toast.error(isTamil ? 'பணம் செலுத்தும் வசதி தயாராகிறது. சிறிது நேரம் காத்திருக்கவும்.' : 'Payment gateway is still initializing. Please wait a moment.');
      return;
    }

    try {
      setLoading(true);
      const toastId = toast.loading(isTamil ? 'மாதாந்திர சந்தா தயார் செய்யப்படுகிறது...' : 'Setting up Monthly AutoPay...');

      const res = await createMonthlySubscription();
      toast.dismiss(toastId);

      if (res?.data?.alreadyActive) {
        toast.success(isTamil ? 'உங்களிடம் ஏற்கனவே பிரீமியம் திட்டம் செயலில் உள்ளது!' : 'You already have an active Premium Subscription!');
        if (refreshUserProfile) await refreshUserProfile();
        navigate('/my-gold');
        return;
      }

      const { subscriptionId, keyId, description } = res.data;

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'My Gold',
        description: description || 'Monthly Premium Vault Subscription',
        theme: {
          color: '#f59e0b',
        },
        handler: async function (response) {
          try {
            toast.loading(isTamil ? 'சரிபார்க்கிறது...' : 'Verifying AutoPay authorization...', { id: 'verify-sub' });
            await verifyMonthlySubscription({
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success(isTamil ? 'பிரீமியம் திட்டம் வெற்றிகரமாக செயல்படுத்தப்பட்டது! 👑' : 'Monthly Premium AutoPay active! Unlimited entries unlocked.', { id: 'verify-sub' });
            if (refreshUserProfile) await refreshUserProfile();
            navigate('/my-gold');
          } catch (err) {
            toast.error(err.response?.data?.message || (isTamil ? 'சரிபார்ப்பதில் பிழை.' : 'Subscription verification failed.'), { id: 'verify-sub' });
          }
        },
        prefill: {
          name: user?.username || user?.name || '',
          email: user?.email || '',
          contact: user?.phone ? `+91${user.phone}` : '',
        },
        modal: {
          ondismiss: function () {
            toast.error(isTamil ? 'பணம் செலுத்துதல் ரத்து செய்யப்பட்டது.' : 'Subscription setup dismissed.');
          },
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response) {
        toast.error(`${isTamil ? 'பணம் செலுத்துதல் தோல்வியடைந்தது' : 'AutoPay Authorization Failed'}: ${response.error?.description || ''}`);
      });

      rzp1.open();
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || (isTamil ? 'சந்தாவைத் தொடங்குவதில் பிழை.' : 'Failed to initialize subscription'));
    } finally {
      setLoading(false);
    }
  };

  const entriesUsed = entitlement?.entriesUsed ?? (user?.free_entries_used || 0);

  const features = isTamil
    ? [
        '10 இலவச பதிவுகளுக்கு மேலும் வரம்பற்ற தங்கம் & வெள்ளி சேர்க்கலாம்',
        'நேரடி சந்தை விலை அடிப்படையில் தானியங்கி மதிப்பீடு',
        'பாதுகாப்பான பில் மற்றும் நகை புகைப்பட சேமிப்பு',
        'எப்போது வேண்டுமானாலும் ரத்து செய்யும் மாதாந்திர AutoPay வசதி',
        'லாபம் மற்றும் இழப்பு விவரங்களை எளிதாக அறியலாம்',
      ]
    : [
        'Continue beyond 10 free Gold & Silver entries',
        'Real-time live bullion portfolio valuation',
        'Encrypted cloud invoice & jewelry photo storage',
        'Automated monthly AutoPay with cancel anytime option',
        'Multi-city rate differential & profit/loss calculator',
      ];

  return (
    <div className="max-w-md mx-auto space-y-6 pb-28 px-4 pt-4 animate-fade-in text-center">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-heading uppercase tracking-wider">
          <FiStar className="w-3.5 h-3.5 text-amber-500" />
          <span>{t('premiumPlan')}</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
          {isTamil ? 'மாதாந்திர பிரீமியம் சந்தா' : 'Monthly AutoPay Subscription'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm px-4">
          {isTamil 
            ? 'முதல் 10 தங்கம் மற்றும் வெள்ளி பதிவுகள் முற்றிலும் இலவசம். அதற்கு மேல் தொடர்ந்து கண்காணிக்க பிரீமியம் திட்டத்திற்கு மாறவும்.'
            : 'The first 10 combined Gold & Silver asset entries are free. Upgrade to continue tracking beyond 10 entries with automatic monthly renewal.'}
        </p>
      </div>

      {/* Free Tier Usage Tracker */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiRepeat className="w-4 h-4 text-amber-500" />
          <span className="font-semibold">{isTamil ? 'இலவச பதிவுகள் நிலை:' : 'Free Entries Status:'}</span>
        </div>
        <span className="font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-100">
          {entriesUsed} / 10 {isTamil ? 'பயன்படுத்தப்பட்டது' : 'Entries Used'}
        </span>
      </div>

      <div className="rounded-3xl p-6 text-left border border-amber-500/30 relative overflow-hidden shadow-2xl bg-[var(--bg-card)] dark:bg-slate-900/90">
        <div className="relative z-10 flex items-center justify-between mb-2">
          <h2 className="text-xl font-black text-[var(--text-primary)] dark:text-white font-heading">
            {t('premiumPlan')}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-black font-heading">
            {isTamil ? 'மாதாந்திர சந்தா' : 'MONTHLY AUTOPAY'}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 mb-6 relative z-10">
          <span className="text-4xl font-black text-amber-600 dark:text-amber-400 font-heading tabular-nums">
            {loadingPrice ? '—' : `₹${planPrice.toLocaleString('en-IN')}`}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{isTamil ? '/ மாதம்' : '/ month'}</span>
        </div>

        <ul className="space-y-3.5 mb-8 relative z-10">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <FiCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 stroke-[3]" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">{feature}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleStartMonthlySubscription}
          disabled={loading || !isRazorpayLoaded}
          className="w-full py-4 rounded-2xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-black text-sm shadow-[0_4px_14px_rgba(217,154,0,0.3)] relative z-10 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform font-heading border-none disabled:opacity-50"
        >
          {loading 
            ? (isTamil ? 'தயாராகிறது...' : 'Initializing AutoPay...') 
            : `${isTamil ? 'பிரீமியம் தொடங்குங்கள்' : 'Start Monthly Premium'} (₹${planPrice.toLocaleString('en-IN')}${isTamil ? '/மாதம்' : '/mo'})`}
          {!loading && <FiArrowRight className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <FiShield className="w-4 h-4 text-amber-500" />
        <span>{isTamil ? 'Razorpay மூலம் பாதுகாப்பான பரிவர்த்தனை' : 'Secure recurring subscription via Razorpay AutoPay'}</span>
      </div>

      <button
        type="button"
        onClick={() => navigate('/my-gold')}
        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
      >
        {t('returnToDashboard')}
      </button>
    </div>
  );
};

export default Upgrade;
