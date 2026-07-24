import { AfterViewInit, Component, OnInit, OnDestroy } from '@angular/core';
import { HeaderComponent } from '../../../header/header.component';
import { FooterComponent } from '../../../footer/footer.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ShopCommonService } from '../../../common/service/shop-common.service';
import { ToastrService } from 'ngx-toastr';
import { CartEventService } from '../../../common/service/cart-event.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';

declare var jQuery: any;
declare var $: any; // $ लाई पनि एप्लिकेसनले चिन्न सजीलो होस् भनेर थपिएको

@Component({
  selector: 'app-check-out',
  standalone: true, // स्टैंडअलोन कम्पोनेन्ट सुनिश्चित गरिएको
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './check-out.component.html',
})
export class CheckOutComponent implements OnInit, AfterViewInit, OnDestroy {

  isLoading: boolean = false;
  isLocalUpdate: boolean = false;
  shippingCharge: number = 0;
  cartTotalPrice: number = 0;
  totalSum: number = 0;
  totalPrice: number = 0;
  cartList: any[] = [];
  private cartSubscription!: Subscription;

  showErrorName: boolean = false;
  showErrorPhone: boolean = false;
  showErrorInvalidPhone: boolean = false;
  showErrorAddress: boolean = false;
  showErrorPayment: boolean = false;
  showErrorRemarks: boolean = false;

  constructor(
    private router: Router,
    public service: ShopCommonService,
    private toastr: ToastrService,
    private cartEventService: CartEventService
  ) { }


  public baseUrl = environment.apiBaseUrl

  // ... (तपाईंको माथिको कोड उस्तै) ...
  ngOnInit(): void {
    // 🌟 बाहिरको this.fetchCartList(); हटाइयो

    this.cartSubscription = this.cartEventService.cartUpdated$.subscribe((updated: any) => {
      if (updated !== null && updated !== undefined) {

        if (this.isLocalUpdate) {
          this.isLocalUpdate = false;
          return;
        }

        if (Array.isArray(updated)) {
          this.cartList = updated;
          this.calculateTotalFromList();
        } else {
          this.fetchCartList();
        }
      } else {
        // 🌟 पहिलो पटक खुल्दा मात्र API कल गर्ने
        this.fetchCartList();
      }
    });
  }
  // ... (Checkout को postCheckOut र अन्य कोड तपाईंको जस्तै छोड्नुहोस्) ...

  fetchCartList() {
    this.isLoading = true;
    this.service.getCartList().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.cartList = res || [];
        this.calculateTotalFromList();
      },
      error: (err: any) => { this.isLoading = false; }
    });
  }

  calculateTotalFromList() {
    if (this.cartList && this.cartList.length > 0) {
      this.cartTotalPrice = this.cartList.reduce((total: number, item: any) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        return total + (price * qty);
      }, 0);
    } else {
      this.cartTotalPrice = 0;
    }
  }

  ngAfterViewInit(): void {

  }




  calculateDeliveryCharge() {
    return (this.cartTotalPrice + this.shippingCharge);
  }


  private validateCheckout(): boolean {

    const m = this.service.checkoutModel;

    if (!m.customerName?.trim()) {
      // this.toastr.warning('Customer name is required.');
      this.showErrorName = true;
      setTimeout(() => {
        this.showErrorName = false;
      }, 800);
      return false;
    }

    if (!m.phoneNumber?.trim()) {
      // this.toastr.warning('Phone number is required.');
      this.showErrorPhone = true;
      setTimeout(() => {
        this.showErrorPhone = false;
      }, 800);
      return false;
    }

    if (!/^9[678]\d{8}$/.test(m.phoneNumber)) {
      // this.toastr.warning('Invalid phone number.');
      this.showErrorInvalidPhone = true;
      setTimeout(() => {
        this.showErrorInvalidPhone = false;
      }, 800);
      return false;
    }

    if (!m.address?.trim()) {
      // this.toastr.warning('Address is required.');
      this.showErrorAddress = true;
      setTimeout(() => {
        this.showErrorAddress = false;
      }, 800);
      return false;
    }

    if (!m.remarks) {
      // this.toastr.warning('Remarks is required.');
      this.showErrorRemarks = true;
      setTimeout(() => {
        this.showErrorRemarks = false;
      }, 800);
      return false;
    }

    if (!m.paymentMethod) {
      // this.toastr.warning('Please select a payment method.');
      this.showErrorPayment = true;
      setTimeout(() => {
        this.showErrorPayment = false;
      }, 800);
      return false;
    }

    return true;
  }

  postCheckOut(form: any) {
    if (!this.validateCheckout()) {
      return;
    }
    debugger
    this.isLoading = true;

    let payload = {
      customerName: this.service.checkoutModel.customerName,
      phoneNumber: this.service.checkoutModel.phoneNumber,
      address: this.service.checkoutModel.address,
      deliveryCharge: this.calculateDeliveryCharge(),
      remarks: this.service.checkoutModel.remarks,
      paymentMethod: this.service.checkoutModel.paymentMethod
    };

    this.service.order(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        console.log(res);
        this.toastr.success('Successfully payment done');

        // २. Checkout Component को डेटा तुरुन्तै जिरो बनाउने
        this.cartList = [];
        this.cartTotalPrice = 0;

        // 🌟 यहाँ झन् बलियो बनाउन local update लाई true राखियो ताकि यो आफ्नै सब्स्क्रिप्सनमा नअल्झियोस्
        this.isLocalUpdate = true;

        // ३. सबै कम्पोनेन्टहरू (Sidebar, Shop-Cart, Header) लाई खाली गर्न अलार्म बजाउने
        this.cartEventService.notifyCartUpdate([]);

        this.router.navigate(['shop/confirmation'], {
          queryParams: {
            orderId: res.orderId,
            orderNo: res.orderNo,
            deliveryCharge: res.deliveryCharge,
            orderStatus: res.orderStatus,
            totalAmount: res.totalAmount
          }
        });

        // ४. Form object लाई रिसेट गर्ने
        if (form) {
          form.resetForm();
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastr.error('', 'Something went wrong');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  reset() {

  }

  // postCheckOut(form: any) {
  //   if (!form || form.invalid) {
  //     this.toastr.warning('कृपया मागिएका सबै विवरणहरू (*) सहीसँग भर्नुहोस्।', 'Validation Error');
  //     return;
  //   }

  //   this.isLoading = true;

  //   let payload = {
  //     customerName: this.service.checkoutModel.customerName,
  //     phoneNumber: this.service.checkoutModel.phoneNumber,
  //     address: this.service.checkoutModel.address,
  //     deliveryCharge: this.calculateDeliveryCharge(),
  //     remarks: this.service.checkoutModel.remarks,
  //     paymentMethod: "cash"
  //   };


  //   this.service.order(payload).subscribe({
  //     next: (res: any) => {
  //       this.isLoading = false;
  //       this.toastr.success('Successfully payment done');

  //       // 🌟 नयाँ थपिएको भाग: ब्याकइन्डले आफैँ डिलिट गरेन भने हामी फ्रन्टइन्डबाटै एक-एक गरी डिलिट गरिदिने
  //       if (this.cartList && this.cartList.length > 0) {
  //         this.cartList.forEach((item: any) => {
  //            // cartDetailId वा ID जुन नामले ब्याकइन्डले चिन्छ, त्यही पठाउने
  //           if (item.cartDetailId) { 
  //             this.service.deleteCart(item.cartDetailId).subscribe(); 
  //           }
  //         });
  //       }

  //       // तलको कोड तपाईंको पहिल्यै छ...
  //       // this.cartList = [];
  //       // this.cartTotalPrice = 0;
  //       this.isLocalUpdate = true;
  //       this.cartEventService.notifyCartUpdate([]);

  //       if (form) {
  //         form.resetForm();
  //       }
  //     },
  //     error: (err: any) => { /* ... */ }
  //   });
  // }


  // 🌟 मेमोरी लीक हुनबाट जोगाउन अन-सब्स्क्राइब थपियो
  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }
}