<template>
  <div class="main-container">
    <WxtLoading v-model="isInitLoading"></WxtLoading>
    <div v-if="!isInitLoading" class="layout">
      <div v-if="address" class="address-container">
        <div>
          <div class="name">{{ address.contact_name }}</div>
          <div class="tel">{{ address.contact_phone }}</div>
        </div>
        <div class="row">{{ address.province }} - {{ address.city }} - {{ address.district }} - {{ address.address }}</div>
        <div @click="$navigateTo('/pages/address/main')" class="row blue wave">去修改/完善>>></div>
      </div>
      <div v-if="!address" class="address-container-none">
        <div class="row">您未填写地址等信息</div>
        <div @click="$navigateTo('/pages/address/main')" class="to wave">前往填写>></div>
      </div>
    </div>
  </div>
</template>

<script>
  import WxtButton from '../../components/WxtButton'
  import WxtLoading from '../../components/WxtLoading'
  import { getDefaultAddress } from "../../api/address";
  import { submitOrder, submitOrderForTimeLimit, pay, getOrderFinalPrice } from "../../api/order";
  import { getSku } from "../../api/goods";
  import { mapState } from 'vuex'
  import property from '../../property'
  import resultCode from '../../axios/resultCode'
  import i18n from '../../i18n'
  export default {
    data () {
      return {
        property,
        isInitLoading: true,
        isPayModalVisible: false,
        address: null,
        wxtTel: property.WXT_TEL,
        goods: {},
        price: {},
        skus: [],
        count: 0,
        sumPrice: 0,
        remark: '',
      }
    },
    components: {
      WxtButton,
    },
    WxtLoading,
    computed: {
      totalDiscount() {
        return (Number(this.price.couponAmount) + Number(this.price.memberAmount)).toFixed(2);
      },
      ...mapState({
        coupon: 'coupon'
      })
    },
    methods: {
      async getSku() {
        this.sumPrice = 0;
        const skus = JSON.parse(this.$mp.query.skus);
        let { data } = await getSku({ skus });
        if (data.code === resultCode.SUCCESS.code) {
          this.skus = data.data || [];
          this.skus.forEach((sku) => {
            this.sumPrice += Number((sku.discount_price || sku.price)) * sku.num;
          });
        }
      },
      async getOrderFinalPrice() {
        let items = JSON.parse(this.$mp.query.skus);
        items.forEach(item => {
          item.amount = item.num;
        });
        let { data } = await getOrderFinalPrice({ coupon_code_id: this.coupon.id || '',  items });
        if (data.code === resultCode.SUCCESS.code) {
          this.price = data.data || {};
        }
      },
      async getDefaultAddress() {
        let { data } = await getDefaultAddress();
        if (data.code === resultCode.SUCCESS.code) {
          this.address = data.data;
        }
      },
      async submitOrder() {
        if (!(this.address && this.address.id)) {
          this.$showToast(i18n.REQUIRE_ORDER_ADDRESS, 'none');
          return;
        }
        this.$showLoading(i18n.RUNNING);
        const skus = this.skus.map(sku => ({ sku_id: sku.id, amount: sku.num }));
        let { data } = this.skus[0].product.theme_id === property.THEME_TIME_LIMIT_SALE ?
          await submitOrderForTimeLimit({
            address_id: this.address.id,
            sku_id: this.skus[0].id,
            remark: this.remark,
            coupon_code_id: this.$store.state.coupon.id,
          }) :
          await submitOrder({
            address_id: this.address.id,
            items: skus,
            remark: this.remark,
            coupon_code_id: this.$store.state.coupon.id,
          });
        if (data.code === resultCode.SUCCESS.code) {
          //下单成功 清空优惠券和发票
          this.$store.commit('SET_COUPON', {});
          const orderId = data.data.id;
          let { data: payData } = await pay(orderId);
          if (payData.code === resultCode.SUCCESS.code) {
            const wxPayParams = payData.data || {};
            let wxPayData = await this.$requestPayment(
              wxPayParams.timeStamp,
              wxPayParams.nonceStr,
              wxPayParams.package,
              wxPayParams.signType,
              wxPayParams.paySign)
              .catch(e => {
                this.$hideLoading();
                setTimeout(() => {
                  this.$redirectTo(`/pages/orderDetail/main?id=${orderId}`);
                }, property.NAVIGATE_DELAY);
            });
            if (wxPayData.errMsg.includes('ok')) {
              this.$showToast(i18n.PAY_SUCCESS);
              setTimeout(() => {
                this.$redirectTo(`/pages/orderDetail/main?id=${orderId}`);
              }, property.NAVIGATE_DELAY);
            }
          }
        }
      },
      stopTouchMove() {},
    },
    onLoad() {
      this.$store.commit('SET_COUPON', {});
    },
    async onShow() {
      this.isInitLoading = true;
      await Promise.all([this.getDefaultAddress(), this.getSku(), this.getOrderFinalPrice()]);
      setTimeout(() => {
        this.isInitLoading = false;
      }, property.LOADING_DELAY)
    },
    onUnload() {
      this.isInitLoading = true;
      this.isPayModalVisible = false;
      this.price = {};
    }
  }
</script>

<style scoped lang="scss">
  .main-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    .address-container {
      width: 600rpx;
      padding: 75rpx 75rpx 0 75rpx;
      font-size: 35rpx;
      .row {
        width: 100%;
        display: flex;
        margin-bottom: 25rpx;
        .name {
          margin-right: 40rpx;
        }
      }
      .blue {
        color: #0180c2;
      }
    }
    .address-container-none {
      width: 100%;
      height: 200rpx;
      .row {
        width: 100%;
        text-align: center;
        color: #888;
        font-size: 30rpx;
        margin-top: 50rpx;
      }
      .to {
        color: #0180c2;
        width: 100%;
        text-align: center;
        margin-top: 30rpx;
        font-size: 35rpx;
      }
    }
    .goods-info-container {
      width: 100%;
      .title {
        display: flex;
        align-items: center;
        padding-left: 40rpx;
        font-size: 35rpx;
        margin-bottom: 30rpx;
        .buy {
          width: 35rpx;
          height: 35rpx;
          margin-right: 20rpx;
        }
      }
      .goods-info {
        width: 700rpx;
        padding: 25rpx;
        background-color: rgb(245, 245, 245);
        display: flex;
        font-size: 32rpx;
        .goods-img {
          width: 220rpx;
          height: 220rpx;
        }
        .info-detail {
          margin-left: 30rpx;
          position: relative;
          .goods-name {
            width: 400rpx;
          }
          .goods-type {
            width: 400rpx;
            height: 40rpx;
            color: #888;
            margin-top: 10rpx;
            font-size: 28rpx;
            line-height: 40rpx;
          }
          .goods-price {
            width: 380rpx;
            display: flex;
            justify-content: space-between;
            font-size: 38rpx;
            margin-top: 10rpx;
            position: absolute;
            bottom: 0;
            .price {
              color: rgb(194, 53, 54);
            }
            .count {
              color: #000;
            }
          }
        }
      }
      .tip {
        display: flex;
        align-items: center;
        padding-left: 40rpx;
        height: 120rpx;
        font-size: 35rpx;
        color: rgb(194, 53, 54);
        border-bottom: 1rpx solid #ddd;
        .check {
          width: 35rpx;
          height: 35rpx;
          margin-right: 20rpx;
        }
      }
      .form-container {
        .form-item {
          display: flex;
          align-items: center;
          height: 120rpx;
          font-size: 35rpx;
          position: relative;
          border-bottom: 1rpx solid #ddd;
          .label {
            margin-left: 35rpx;
          }
          .call {
            width: 220rpx;
            height: 100%;
            .icon {
              width: 55rpx;
              height: 55rpx;
              margin-right: 20rpx;
            }
            display: flex;
            align-items: center;
            margin-left: 35rpx;
            margin-right: 100rpx;
          }
          .value {
            width: 500rpx;
            line-height: 120rpx;
            height: 100%;
            color: #888;
            font-size: 30rpx;
          }
          .arrow-right {
            position: absolute;
            top: 35rpx;
            right: 30rpx;
          }
        }
      }
      .submit-container {
        width: 680rpx;
        height: 150rpx;
        padding: 0 35rpx;
        border-top: 10rpx solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
        .submit-left {
          color: rgb(194, 53, 54);
          .price {
            display: flex;
            align-items: baseline;
            .price-label {
              font-size: 35rpx;
            }
            .price-value {
              font-size: 50rpx;
            }
          }
          .fav {
            color: #aaa;
            font-size: 30rpx;
            margin-top: 10rpx;
          }
        }
        .submit-right {
          width: 220rpx;
          height: 85rpx;
          background-color: #0180c2;
          text-align: center;
          line-height: 85rpx;
          color: #fff;
          font-size: 35rpx;
        }
      }
    }
    .pay-modal {
      z-index: 999;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, .8);
      display: flex;
      align-items: center;
      justify-content: center;
      .pay-inner {
        width: 580rpx;
        background-color: #fff;
        border-radius: 30rpx;
        .title {
          width: 100%;
          height: 110rpx;
          font-size: 45rpx;
          display: flex;
          justify-content: center;
          align-items: center;
          border-bottom: 1rpx solid #0180c2;
          position: relative;
          .close {
            width: 50rpx;
            height: 50rpx;
            position: absolute;
            right: 30rpx;
            top: 30rpx;
          }
        }
        .price {
          width: 100%;
          font-size: 75rpx;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 35rpx;
        }
        .method {
          width: 100%;
          font-size: 32rpx;
          color: #0180c2;
          display: flex;
          justify-content: center;
          margin-top: 35rpx;
        }
        .btn {
          width: 450rpx;
          margin: 35rpx auto;
        }
      }
    }
    .gap-line {
      width: 100%;
      height: 6rpx;
      margin-top: 30rpx;
      margin-bottom: 40rpx;
    }
  }
</style>
